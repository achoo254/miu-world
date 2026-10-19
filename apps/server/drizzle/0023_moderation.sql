CREATE TABLE "player_restrictions" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_restrictions_kind_valid" CHECK ("player_restrictions"."kind" in ('hidden', 'locked'))
);
--> statement-breakpoint
CREATE TABLE "report_witnesses" (
	"report_id" uuid NOT NULL,
	"child_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_witnesses_report_id_child_id_pk" PRIMARY KEY("report_id","child_id")
);
--> statement-breakpoint
ALTER TABLE "mail" ADD COLUMN "params" jsonb;--> statement-breakpoint
ALTER TABLE "player_reports" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "player_reports" ADD COLUMN "handled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "player_reports" ADD COLUMN "handled_by" uuid;--> statement-breakpoint
ALTER TABLE "player_reports" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "player_reports" ADD COLUMN "incident_lines" jsonb;--> statement-breakpoint
ALTER TABLE "player_restrictions" ADD CONSTRAINT "player_restrictions_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_witnesses" ADD CONSTRAINT "report_witnesses_report_id_player_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."player_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_witnesses" ADD CONSTRAINT "report_witnesses_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_witnesses_child_idx" ON "report_witnesses" USING btree ("child_id");--> statement-breakpoint
CREATE INDEX "report_witnesses_created_idx" ON "report_witnesses" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_handled_by_parents_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_reports_status_idx" ON "player_reports" USING btree ("status","created_at");--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_status_valid" CHECK ("player_reports"."status" in ('open', 'dismissed', 'warned', 'renamed', 'locked'));--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_note_length" CHECK (char_length("player_reports"."note") <= 300);