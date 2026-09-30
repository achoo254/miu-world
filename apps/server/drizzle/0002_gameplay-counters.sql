CREATE TABLE "step_attempts" (
	"child_id" uuid NOT NULL,
	"quest_id" text NOT NULL,
	"step_id" text NOT NULL,
	"wrong_count" integer DEFAULT 0 NOT NULL,
	"answer_views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "step_attempts_child_id_quest_id_step_id_pk" PRIMARY KEY("child_id","quest_id","step_id")
);
--> statement-breakpoint
ALTER TABLE "quest_progress" ADD COLUMN "found" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD COLUMN "stars" smallint;--> statement-breakpoint
ALTER TABLE "quest_progress" ADD COLUMN "xp_awarded" integer;--> statement-breakpoint
ALTER TABLE "step_attempts" ADD CONSTRAINT "step_attempts_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;