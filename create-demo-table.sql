create table public."wtaf_zero_admin_collaborative_DEMO" (
  id bigint not null default nextval('wtaf_zero_admin_collaborative_id_seq'::regclass),
  app_id character varying(255) not null,
  participant_id character varying(100) null,
  participant_data jsonb null,
  action_type character varying(50) not null,
  content_data jsonb not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  origin_app_slug text null,
  constraint wtaf_zero_admin_collaborative_DEMO_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists "wtaf_zero_admin_collaborative_DEMO_app_id_created_at_idx" on public."wtaf_zero_admin_collaborative_DEMO" using btree (app_id, created_at) TABLESPACE pg_default;

create index IF not exists "wtaf_zero_admin_collaborative_DEMO_app_id_participant_id_idx" on public."wtaf_zero_admin_collaborative_DEMO" using btree (app_id, participant_id) TABLESPACE pg_default;

create index IF not exists "wtaf_zero_admin_collaborative_DEMO_app_id_action_type_idx" on public."wtaf_zero_admin_collaborative_DEMO" using btree (app_id, action_type) TABLESPACE pg_default;

create index IF not exists "wtaf_zero_admin_collaborative_DEMO_origin_app_slug_idx" on public."wtaf_zero_admin_collaborative_DEMO" using btree (origin_app_slug) TABLESPACE pg_default; 