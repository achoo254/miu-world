CREATE TABLE "npc_friendships" (
	"child_id" uuid NOT NULL,
	"npc_id" text NOT NULL,
	"talk_points" integer DEFAULT 0 NOT NULL,
	"gift_points" integer DEFAULT 0 NOT NULL,
	"last_talk_on" date,
	"last_gift_on" date,
	CONSTRAINT "npc_friendships_child_id_npc_id_pk" PRIMARY KEY("child_id","npc_id"),
	CONSTRAINT "npc_friendships_points_not_negative" CHECK ("npc_friendships"."talk_points" >= 0 and "npc_friendships"."gift_points" >= 0)
);
--> statement-breakpoint
ALTER TABLE "npc_friendships" ADD CONSTRAINT "npc_friendships_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;