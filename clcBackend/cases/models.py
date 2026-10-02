import uuid

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import Channel, Lang, Priority


class CaseStatus(models.TextChoices):
    NEW = 'new', 'New'
    UNDER_REVIEW = 'under_review', 'Under review'
    REFERRED = 'referred', 'Referred'
    ACCEPTED = 'accepted', 'Accepted'
    ADVOCATE_ASSIGNED = 'advocate_assigned', 'Advocate assigned'
    ACTIVE = 'active', 'Active'
    CLOSED = 'closed', 'Closed'
    REFERRED_BACK = 'referred_back', 'Referred back'


class CaseOutcome(models.TextChoices):
    RESOLVED = 'resolved', 'Resolved'
    WITHDRAWN_BY_CLIENT = 'withdrawn_by_client', 'Withdrawn by client'
    NOT_TAKEN = 'not_taken', 'Not taken'
    NO_FIRM_AVAILABLE = 'no_firm_available', 'No firm available'


class ReferralStatus(models.TextChoices):
    CONSENT_REQUESTED = 'consent_requested', 'Consent requested'
    CONSENT_REFUSED = 'consent_refused', 'Consent refused'
    SENT = 'sent', 'Sent'
    ACCEPTED = 'accepted', 'Accepted'
    DECLINED = 'declined', 'Declined'
    RETURNED = 'returned', 'Returned'
    WITHDRAWN = 'withdrawn', 'Withdrawn'
    COMPLETED = 'completed', 'Completed'


class ConsentDecision(models.TextChoices):
    GIVEN = 'given', 'Given'
    REFUSED = 'refused', 'Refused'


class DocCategory(models.TextChoices):
    ID_COPY = 'id_copy', 'ID copy'
    PML_LICENCE = 'pml_licence', 'PML licence'
    EIA_CERTIFICATE = 'eia_certificate', 'EIA certificate'
    CONTRACT = 'contract', 'Contract'
    TSA = 'tsa', 'TSA'
    DEED_POLL = 'deed_poll', 'Deed poll'
    GAZETTE_NOTICE = 'gazette_notice', 'Gazette notice'
    WILL = 'will', 'Will'
    LETTER = 'letter', 'Letter'
    BUSINESS_LICENCE = 'business_licence', 'Business licence'
    PRACTISING_CERTIFICATE = 'practising_certificate', 'Practising certificate'
    OTHER = 'other', 'Other'


class DocVisibility(models.TextChoices):
    CLC_ONLY = 'clc_only', 'CLC only'
    SHARED_WITH_FIRM = 'shared_with_firm', 'Shared with firm'


class Case(models.Model):
    """A client's legal case, from the bot's first question to closure.
    Owned by CLC; a firm only ever handles it through a referral."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference = models.TextField(unique=True)  # CLC/2026/0014
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='cases')
    conversation = models.ForeignKey('conversations.Conversation', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    service = models.ForeignKey('core.Service', null=True, blank=True, on_delete=models.PROTECT)
    channel = models.CharField(max_length=16, choices=Channel.choices, default=Channel.WHATSAPP)
    language = models.CharField(max_length=2, choices=Lang.choices, default=Lang.SW)
    region = models.TextField(null=True, blank=True)
    summary = models.TextField(null=True, blank=True)
    answers = models.JSONField(default=dict, blank=True)  # what the bot collected
    priority = models.CharField(max_length=16, choices=Priority.choices, default=Priority.NORMAL)
    status = models.CharField(max_length=24, choices=CaseStatus.choices, default=CaseStatus.NEW)
    reviewer = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # CLC Admin who started the review
    current_firm = models.ForeignKey('accounts.Organization', null=True, blank=True, on_delete=models.PROTECT, related_name='cases')
    ready_to_close_at = models.DateTimeField(null=True, blank=True)  # L5 "Mark ready to close"
    ready_to_close_summary = models.TextField(null=True, blank=True)
    outcome = models.CharField(max_length=24, choices=CaseOutcome.choices, null=True, blank=True)
    close_reason = models.TextField(null=True, blank=True)
    closed_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    closed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'cases'
        indexes = [
            models.Index(fields=['status', 'updated_at'], name='cases_by_status'),
            models.Index(fields=['current_firm', 'status'], name='cases_by_firm'),
        ]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status='closed') | (Q(outcome__isnull=False) & Q(closed_at__isnull=False)),
                name='cases_closed_needs_outcome',
            ),
            models.CheckConstraint(
                condition=~Q(status__in=['referred', 'accepted', 'advocate_assigned', 'active']) | Q(current_firm__isnull=False),
                name='cases_with_firm_when_referred',
            ),
        ]

    def __str__(self):
        return self.reference


class Document(models.Model):
    """Files on a case, plus firm verification documents."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, null=True, blank=True, on_delete=models.PROTECT, related_name='documents')
    organization = models.ForeignKey('accounts.Organization', null=True, blank=True, on_delete=models.PROTECT, related_name='documents')  # firm verification documents
    message = models.ForeignKey('conversations.Message', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # the WhatsApp message that carried it
    uploaded_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # empty when the client sent it
    category = models.CharField(max_length=32, choices=DocCategory.choices, default=DocCategory.OTHER)
    visibility = models.CharField(max_length=24, choices=DocVisibility.choices, default=DocVisibility.SHARED_WITH_FIRM)
    file_name = models.TextField()
    mime_type = models.TextField()
    size_bytes = models.BigIntegerField()
    storage_key = models.TextField(unique=True)
    sha256 = models.CharField(max_length=64)
    created_at = models.DateTimeField(default=timezone.now)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'documents'
        indexes = [models.Index(fields=['case'], name='documents_by_case')]
        constraints = [
            models.CheckConstraint(condition=Q(size_bytes__gt=0), name='documents_size_positive'),
            models.CheckConstraint(
                condition=Q(case__isnull=False) | Q(organization__isnull=False),
                name='documents_case_or_org',
            ),
        ]


class Referral(models.Model):
    """CLC offering a case to one law firm (screen C5, decided on L3)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name='referrals')
    firm = models.ForeignKey('accounts.Organization', on_delete=models.PROTECT, related_name='referrals')
    referred_by = models.ForeignKey('accounts.Membership', on_delete=models.PROTECT, related_name='+')  # a CLC Admin membership
    summary = models.TextField()  # anonymised: all the firm sees before accepting
    status = models.CharField(max_length=24, choices=ReferralStatus.choices, default=ReferralStatus.CONSENT_REQUESTED)
    consent_requested_at = models.DateTimeField(default=timezone.now)
    sent_at = models.DateTimeField(null=True, blank=True)  # when the client agreed
    responded_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # the firm admin who decided
    responded_at = models.DateTimeField(null=True, blank=True)
    conflict_confirmed = models.BooleanField(default=False)
    reason = models.TextField(null=True, blank=True)  # why declined, returned or withdrawn
    ended_at = models.DateTimeField(null=True, blank=True)
    documents = models.ManyToManyField(Document, through='ReferralDocument', related_name='referrals')

    class Meta:
        db_table = 'referrals'
        indexes = [models.Index(fields=['firm', 'status'], name='referrals_firm_inbox')]
        constraints = [
            models.CheckConstraint(
                condition=~Q(status='accepted') | Q(conflict_confirmed=True),
                name='referrals_accept_needs_conflict_check',
            ),
            models.CheckConstraint(
                condition=~Q(status__in=['declined', 'returned', 'withdrawn']) | Q(reason__isnull=False),
                name='referrals_end_needs_reason',
            ),
            models.UniqueConstraint(
                fields=['case'],
                condition=Q(status__in=['consent_requested', 'sent', 'accepted']),
                name='referrals_one_live',
            ),
        ]

    def clean(self):
        # Only approved law firms can receive a referral
        if self._state.adding and (self.firm.type != 'law_firm' or self.firm.status != 'approved'):
            raise ValidationError('Referrals can only go to an approved law firm')

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class ReferralDocument(models.Model):
    """Documents CLC ticked on C5; the firm can open them only after accepting."""
    referral = models.ForeignKey(Referral, on_delete=models.CASCADE)
    document = models.ForeignKey(Document, on_delete=models.PROTECT)

    class Meta:
        db_table = 'referral_documents'
        constraints = [
            models.UniqueConstraint(fields=['referral', 'document'], name='referral_documents_pk'),
        ]


class Consent(models.Model):
    """The client's answer to W6, kept as evidence."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    referral = models.OneToOneField(Referral, on_delete=models.PROTECT, related_name='consent')
    client = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='consents')
    decision = models.CharField(max_length=8, choices=ConsentDecision.choices)
    wording_version = models.TextField()  # the consent text the client saw
    message = models.ForeignKey('conversations.Message', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # the button tap
    decided_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'consents'


class CaseAssignment(models.Model):
    """Which advocate of the firm handles the case; history kept."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name='assignments')
    advocate = models.ForeignKey('accounts.Membership', on_delete=models.PROTECT, related_name='+')  # an advocate membership
    assigned_by = models.ForeignKey('accounts.Membership', on_delete=models.PROTECT, related_name='+')  # a firm admin membership
    assigned_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'case_assignments'
        constraints = [
            models.UniqueConstraint(fields=['case'], condition=Q(ended_at__isnull=True), name='case_assignments_one_current'),
        ]

    def clean(self):
        # The advocate must be an active advocate of the firm now holding the case
        firm_id = self.case.current_firm_id
        if not (self.advocate.role == 'advocate' and self.advocate.status == 'active'
                and self.advocate.organization_id == firm_id):
            raise ValidationError('Advocate must be an active advocate of the firm holding the case')
        if not (self.assigned_by.role == 'firm_admin' and self.assigned_by.organization_id == firm_id):
            raise ValidationError('Only an admin of the firm holding the case can assign it')

    def save(self, *args, **kwargs):
        if self._state.adding:
            self.clean()
        super().save(*args, **kwargs)


class CaseStatusHistory(models.Model):
    id = models.BigAutoField(primary_key=True)
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name='status_history')
    from_status = models.CharField(max_length=24, choices=CaseStatus.choices, null=True, blank=True)
    to_status = models.CharField(max_length=24, choices=CaseStatus.choices)
    changed_by = models.ForeignKey('accounts.Membership', null=True, blank=True, on_delete=models.SET_NULL, related_name='+')  # empty when the bot or client changed it
    changed_at = models.DateTimeField(default=timezone.now)
    note = models.TextField(null=True, blank=True)

    class Meta:
        db_table = 'case_status_history'
        indexes = [models.Index(fields=['case', 'changed_at'], name='case_status_history_case')]


class CaseNote(models.Model):
    """Visible only inside the organization that wrote it: CLC internal notes never
    reach a firm, firm notes never reach another firm."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case = models.ForeignKey(Case, on_delete=models.PROTECT, related_name='notes')
    organization = models.ForeignKey('accounts.Organization', on_delete=models.PROTECT, related_name='+')
    author = models.ForeignKey('accounts.Membership', on_delete=models.PROTECT, related_name='+')
    body = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'case_notes'
