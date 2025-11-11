-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.co_readings (
  id bigint NOT NULL DEFAULT nextval('co_readings_id_seq'::regclass),
  session_id uuid,
  device_id text NOT NULL,
  co_level double precision NOT NULL,
  status text CHECK (status = ANY (ARRAY['safe'::text, 'warning'::text, 'critical'::text])),
  created_at timestamp with time zone DEFAULT now(),
  mosfet_status boolean DEFAULT false,
  CONSTRAINT co_readings_pkey PRIMARY KEY (id),
  CONSTRAINT co_readings_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(session_id),
  CONSTRAINT co_readings_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id)
);
CREATE TABLE public.device_commands (
  id bigint NOT NULL DEFAULT nextval('device_commands_id_seq'::regclass),
  device_id text NOT NULL,
  command text NOT NULL,
  executed boolean DEFAULT false,
  executed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT device_commands_pkey PRIMARY KEY (id),
  CONSTRAINT device_commands_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id)
);
CREATE TABLE public.devices (
  device_id text NOT NULL,
  device_name text,
  vehicle_model text,
  last_active timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT devices_pkey PRIMARY KEY (device_id)
);
CREATE TABLE public.sessions (
  session_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  device_id text NOT NULL,
  user_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  notes text,
  ai_analysis text,
  last_heartbeat timestamp with time zone DEFAULT now(),
  CONSTRAINT sessions_pkey PRIMARY KEY (session_id),
  CONSTRAINT sessions_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.devices(device_id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);