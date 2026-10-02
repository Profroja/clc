from django.db import migrations

FORWARD = """
CREATE FUNCTION activity_events_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'activity_events rows cannot be changed or deleted';
END $$;
CREATE TRIGGER activity_events_no_change BEFORE UPDATE OR DELETE ON activity_events
  FOR EACH ROW EXECUTE FUNCTION activity_events_append_only();
"""

REVERSE = """
DROP TRIGGER activity_events_no_change ON activity_events;
DROP FUNCTION activity_events_append_only();
"""


class Migration(migrations.Migration):

    dependencies = [
        ('tracking', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(FORWARD, REVERSE),
    ]
