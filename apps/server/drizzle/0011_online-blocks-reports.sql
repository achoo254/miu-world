CREATE TABLE "player_blocks" (
	"child_id" uuid NOT NULL,
	"blocked_child_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_blocks_child_id_blocked_child_id_pk" PRIMARY KEY("child_id","blocked_child_id"),
	CONSTRAINT "player_blocks_not_self" CHECK ("player_blocks"."child_id" <> "player_blocks"."blocked_child_id")
);
--> statement-breakpoint
CREATE TABLE "player_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"reported_child_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"map_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_reports_reason_valid" CHECK ("player_reports"."reason" in ('harassment', 'spam', 'name', 'other'))
);
--> statement-breakpoint
ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_blocked_child_id_child_profiles_id_fk" FOREIGN KEY ("blocked_child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_reports" ADD CONSTRAINT "player_reports_reported_child_id_child_profiles_id_fk" FOREIGN KEY ("reported_child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "player_blocks_blocked_idx" ON "player_blocks" USING btree ("blocked_child_id");--> statement-breakpoint
CREATE INDEX "player_reports_reported_idx" ON "player_reports" USING btree ("reported_child_id");--> statement-breakpoint
CREATE INDEX "player_reports_child_idx" ON "player_reports" USING btree ("child_id");