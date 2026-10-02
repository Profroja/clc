import uuid

from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models import Q
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError('Email is required')
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)  # None -> unusable password until an invitation is accepted
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault('is_superuser', False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra['is_superuser'] = True
        return self._create_user(email, password, **extra)

    def get_by_natural_key(self, email):
        return self.get(email__iexact=email)


class User(AbstractBaseUser, PermissionsMixin):
    """A person with a sign-in. Roles are NOT here: they are memberships."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.TextField()
    email = models.EmailField(unique=True)  # stored lowercase
    phone_e164 = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_login = models.DateTimeField(db_column='last_login_at', null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        db_table = 'users'

    @property
    def is_staff(self):
        # Django admin access is for platform superusers only; portal roles are memberships.
        return self.is_superuser

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        super().save(*args, **kwargs)

    def get_full_name(self):
        return self.full_name

    def get_short_name(self):
        return self.full_name

    def __str__(self):
        return self.email


class OrgType(models.TextChoices):
    CLC = 'clc', 'CLC'
    LAW_FIRM = 'law_firm', 'Law firm'


class OrgStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    APPROVED = 'approved', 'Approved'
    SUSPENDED = 'suspended', 'Suspended'
    REJECTED = 'rejected', 'Rejected'


class MemberRole(models.TextChoices):
    CLC_ADMIN = 'clc_admin', 'CLC Admin'
    FIRM_ADMIN = 'firm_admin', 'Firm Admin'
    ADVOCATE = 'advocate', 'Advocate'


class MembershipStatus(models.TextChoices):
    INVITED = 'invited', 'Invited'
    ACTIVE = 'active', 'Active'
    SUSPENDED = 'suspended', 'Suspended'
    REMOVED = 'removed', 'Removed'


class Organization(models.Model):
    """CLC itself (exactly one row) and every law firm."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=16, choices=OrgType.choices)
    name = models.TextField()
    registration_number = models.TextField(null=True, blank=True)
    tin = models.TextField(null=True, blank=True)
    region = models.TextField(null=True, blank=True)
    regions_served = ArrayField(models.TextField(), default=list, blank=True)
    address = models.TextField(null=True, blank=True)
    email = models.TextField(null=True, blank=True)
    phone_e164 = models.TextField(null=True, blank=True)
    status = models.CharField(max_length=16, choices=OrgStatus.choices, default=OrgStatus.PENDING)
    status_reason = models.TextField(null=True, blank=True)  # why rejected or suspended
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    services = models.ManyToManyField('core.Service', through='FirmService', related_name='firms')

    class Meta:
        db_table = 'organizations'
        constraints = [
            models.UniqueConstraint(fields=['type'], condition=Q(type='clc'), name='organizations_one_clc'),
            models.CheckConstraint(
                condition=~Q(status__in=['rejected', 'suspended']) | Q(status_reason__isnull=False),
                name='organizations_reason_required',
            ),
        ]

    def __str__(self):
        return self.name


class FirmService(models.Model):
    """Services each firm handles (filters the firm list on the Referral screen)."""
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT)
    service = models.ForeignKey('core.Service', on_delete=models.PROTECT)

    class Meta:
        db_table = 'firm_services'
        constraints = [
            models.UniqueConstraint(fields=['organization', 'service'], name='firm_services_pk'),
        ]


class Membership(models.Model):
    """One row per role a person holds. The 'Working as' chooser lists these rows."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name='memberships')
    organization = models.ForeignKey(Organization, on_delete=models.PROTECT, related_name='memberships')
    role = models.CharField(max_length=16, choices=MemberRole.choices)
    status = models.CharField(max_length=16, choices=MembershipStatus.choices, default=MembershipStatus.INVITED)
    invited_by = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'memberships'
        constraints = [
            models.UniqueConstraint(fields=['user', 'organization', 'role'], name='memberships_user_org_role_uq'),
        ]

    def clean(self):
        from django.core.exceptions import ValidationError
        # clc_admin exists only in CLC; firm roles exist only in law firms
        if (self.role == MemberRole.CLC_ADMIN) != (self.organization.type == OrgType.CLC):
            raise ValidationError(f'Role {self.role} is not allowed in an organization of type {self.organization.type}')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.organization.name} - {self.get_role_display()} ({self.user.email})'


class AdvocateProfile(models.Model):
    """Professional details of a person who practises as an advocate (one per person, any firm)."""
    user = models.OneToOneField(User, primary_key=True, on_delete=models.PROTECT, related_name='advocate_profile')
    roll_number = models.TextField(unique=True)
    practising_certificate = models.TextField(null=True, blank=True)
    certificate_expires_on = models.DateField(null=True, blank=True)
    platform_suspended_at = models.DateTimeField(null=True, blank=True)  # set by CLC (screen C7)
    platform_suspended_reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'advocate_profiles'
        constraints = [
            models.CheckConstraint(
                condition=Q(platform_suspended_at__isnull=True) | Q(platform_suspended_reason__isnull=False),
                name='advocate_suspension_reason_required',
            ),
        ]
