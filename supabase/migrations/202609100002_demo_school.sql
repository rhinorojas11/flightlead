insert into public.schools (
  id,
  name,
  inbound_phone,
  alert_phone,
  timezone,
  approved_faq
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Front Range Flight Academy',
  '+15555550100',
  null,
  'America/Denver',
  jsonb_build_object(
    'fictional_demo_data', true,
    'location', 'Demo location near Denver, Colorado',
    'training_framework', 'Part 61 training for this fictional demo',
    'programs', jsonb_build_array(
      'Private Pilot Certificate',
      'Instrument Rating',
      'Commercial Pilot Certificate',
      'Discovery Flight'
    ),
    'aircraft', jsonb_build_array('Cessna 172 training aircraft'),
    'discovery_flight', jsonb_build_object(
      'price', '$199 demo price',
      'duration', 'Approximately one hour total with a preflight briefing',
      'booking', 'A staff member confirms all availability and bookings'
    ),
    'private_pilot_estimate', jsonb_build_object(
      'range', '$14,000-$18,000 fictional planning estimate',
      'disclaimer', 'Actual cost depends on training frequency, proficiency, aircraft rates, and instructor time. Staff must provide a current personalized estimate.'
    ),
    'hours', 'Monday-Saturday, 8:00 AM-6:00 PM demo hours',
    'financing', 'Ask staff about current financing options; the assistant may not promise approval or terms',
    'medical', 'Medical eligibility questions must be referred to a qualified aviation medical examiner or school staff',
    'availability', 'Aircraft and instructor availability must always be confirmed by staff'
  )
)
on conflict (inbound_phone) do update
set
  name = excluded.name,
  alert_phone = excluded.alert_phone,
  timezone = excluded.timezone,
  approved_faq = excluded.approved_faq;

comment on table public.schools is
  'Server-managed school configuration. The included Front Range record is fictional demo data only.';
