CREATE TABLE "bot_memories" (
	"bot_id" text NOT NULL,
	"child_id" uuid NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"last_quest_id" text NOT NULL,
	"last_played_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_memories_bot_id_child_id_pk" PRIMARY KEY("bot_id","child_id")
);
--> statement-breakpoint
CREATE TABLE "bot_skills" (
	"bot_id" text NOT NULL,
	"skill_id" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_skills_bot_id_skill_id_pk" PRIMARY KEY("bot_id","skill_id"),
	CONSTRAINT "bot_skills_xp_not_negative" CHECK ("bot_skills"."xp" >= 0)
);
--> statement-breakpoint
CREATE TABLE "question_stats" (
	"question_key" text PRIMARY KEY NOT NULL,
	"answers" integer DEFAULT 0 NOT NULL,
	"rights" integer DEFAULT 0 NOT NULL,
	"times" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bot_memories" ADD CONSTRAINT "bot_memories_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bot_memories_child_idx" ON "bot_memories" USING btree ("child_id");