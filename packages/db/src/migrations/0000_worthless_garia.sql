CREATE TABLE IF NOT EXISTS "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"segment" varchar(50) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"state" varchar(2),
	"plan" varchar(20) DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"evolution_instance_name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "clinics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clinic_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"ai_start_time" varchar(5) DEFAULT '18:01' NOT NULL,
	"ai_end_time" varchar(5) DEFAULT '07:59' NOT NULL,
	"ai_enabled_days" jsonb DEFAULT '[0,1,2,3,4,5,6]'::jsonb NOT NULL,
	"ai_always_on" boolean DEFAULT false NOT NULL,
	"ai_manual_override" boolean DEFAULT false NOT NULL,
	"timezone" varchar(50) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"welcome_message" text,
	"fallback_message" text,
	"min_advance_hours" integer DEFAULT 2 NOT NULL,
	"max_advance_days" integer DEFAULT 30 NOT NULL,
	"slot_interval_minutes" integer DEFAULT 0 NOT NULL,
	"auto_book" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clinic_settings_clinic_id_unique" UNIQUE("clinic_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"phone" varchar(20),
	"role" varchar(20) DEFAULT 'secretary' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professionals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"duration_minutes" integer NOT NULL,
	"price_in_cents" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "professional_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "working_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blocked_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"professional_id" uuid,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"name" varchar(255),
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"notes" text,
	"last_contact_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"professional_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"cancelled_at" timestamp,
	"cancel_reason" varchar(255),
	"source" varchar(20) DEFAULT 'ai' NOT NULL,
	"nps_score" integer,
	"nps_feedback" text,
	"nps_sent_at" timestamp,
	"nps_responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"channel" varchar(20) DEFAULT 'whatsapp' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"audio_url" text,
	"intent" varchar(30),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"professional_id" uuid,
	"preferred_days" jsonb,
	"preferred_time_start" varchar(5),
	"preferred_time_end" varchar(5),
	"status" varchar(20) DEFAULT 'waiting' NOT NULL,
	"notified_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "booking_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"professional_id" uuid,
	"requested_start_at" timestamp NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"owner_note" text,
	"suggested_start_at" timestamp,
	"appointment_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"content" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"embedding" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_size" integer NOT NULL,
	"page_count" integer,
	"chunk_count" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'processing' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "clinic_settings" ADD CONSTRAINT "clinic_settings_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "working_hours" ADD CONSTRAINT "working_hours_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blocked_times" ADD CONSTRAINT "blocked_times_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contacts" ADD CONSTRAINT "contacts_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_professional_id_professionals_id_fk" FOREIGN KEY ("professional_id") REFERENCES "public"."professionals"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinics_segment_idx" ON "clinics" USING btree ("segment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinics_is_active_idx" ON "clinics" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_clinic_id_idx" ON "users" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "professionals_clinic_id_idx" ON "professionals" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_clinic_id_idx" ON "services" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "services_category_idx" ON "services" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ps_clinic_id_idx" ON "professional_services" USING btree ("clinic_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ps_prof_service_unique" ON "professional_services" USING btree ("professional_id","service_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wh_clinic_prof_day_idx" ON "working_hours" USING btree ("clinic_id","professional_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bt_clinic_time_idx" ON "blocked_times" USING btree ("clinic_id","start_at","end_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bt_clinic_prof_time_idx" ON "blocked_times" USING btree ("clinic_id","professional_id","start_at","end_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "contacts_clinic_phone_unique" ON "contacts" USING btree ("clinic_id","phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "contacts_status_idx" ON "contacts" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_clinic_date_status_idx" ON "appointments" USING btree ("clinic_id","start_at","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_clinic_prof_date_idx" ON "appointments" USING btree ("clinic_id","professional_id","start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appt_clinic_contact_idx" ON "appointments" USING btree ("clinic_id","contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_clinic_contact_status_idx" ON "conversations" USING btree ("clinic_id","contact_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conv_clinic_status_date_idx" ON "conversations" USING btree ("clinic_id","status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "msg_conv_date_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "msg_clinic_id_idx" ON "messages" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "wl_clinic_service_status_idx" ON "waitlist" USING btree ("clinic_id","service_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "br_clinic_status_idx" ON "booking_requests" USING btree ("clinic_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "br_clinic_date_idx" ON "booking_requests" USING btree ("clinic_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kc_clinic_id_idx" ON "knowledge_chunks" USING btree ("clinic_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kc_document_id_idx" ON "knowledge_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "kd_clinic_id_idx" ON "knowledge_documents" USING btree ("clinic_id");