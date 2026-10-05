CREATE TABLE "play_time" (
	"child_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "play_time_child_id_week_start_pk" PRIMARY KEY("child_id","week_start"),
	CONSTRAINT "play_time_seconds_not_negative" CHECK ("play_time"."seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "play_time" ADD CONSTRAINT "play_time_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;