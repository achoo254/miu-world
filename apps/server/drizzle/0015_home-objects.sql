CREATE TABLE "home_objects" (
	"child_id" uuid PRIMARY KEY NOT NULL,
	"states" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_objects" ADD CONSTRAINT "home_objects_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;