CREATE TABLE "pet_bonds" (
	"child_id" uuid NOT NULL,
	"pet_id" text NOT NULL,
	"name" text,
	"happiness" smallint NOT NULL,
	"fullness" smallint NOT NULL,
	"cleanliness" smallint NOT NULL,
	"stats_at" timestamp with time zone NOT NULL,
	"care_xp" integer DEFAULT 0 NOT NULL,
	"walk_seconds" integer DEFAULT 0 NOT NULL,
	"care_paid_at" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"walked_at" timestamp with time zone,
	CONSTRAINT "pet_bonds_child_id_pet_id_pk" PRIMARY KEY("child_id","pet_id"),
	CONSTRAINT "pet_bonds_stats_in_range" CHECK ("pet_bonds"."happiness" between 0 and 100 and "pet_bonds"."fullness" between 0 and 100 and "pet_bonds"."cleanliness" between 0 and 100),
	CONSTRAINT "pet_bonds_counters_not_negative" CHECK ("pet_bonds"."care_xp" >= 0 and "pet_bonds"."walk_seconds" >= 0)
);
--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "pet_gear" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "pet_bonds" ADD CONSTRAINT "pet_bonds_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;