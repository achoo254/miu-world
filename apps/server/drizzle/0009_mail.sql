CREATE TABLE "mail" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"template_id" text NOT NULL,
	"category" text NOT NULL,
	"read" integer DEFAULT 0 NOT NULL,
	"claimed" integer DEFAULT 0 NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_child_template" UNIQUE("child_id","template_id")
);
--> statement-breakpoint
ALTER TABLE "mail" ADD CONSTRAINT "mail_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mail_child_idx" ON "mail" USING btree ("child_id");