CREATE TABLE "parent_idp_links" (
	"parent_id" uuid PRIMARY KEY NOT NULL,
	"issuer" text NOT NULL,
	"subject" text NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "parent_idp_links_identity" UNIQUE("issuer","subject")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "kind" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "idp_sid" text;--> statement-breakpoint
ALTER TABLE "parent_idp_links" ADD CONSTRAINT "parent_idp_links_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_idp_sid_idx" ON "sessions" USING btree ("idp_sid");--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_kind_valid" CHECK ("sessions"."kind" in ('web', 'native'));