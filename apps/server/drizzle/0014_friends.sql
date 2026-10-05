CREATE TABLE "friend_requests" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"from_child_id" uuid,
	"from_bot_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friend_requests_one_sender" CHECK (("friend_requests"."from_child_id" is null) <> ("friend_requests"."from_bot_id" is null)),
	CONSTRAINT "friend_requests_not_self" CHECK ("friend_requests"."child_id" <> "friend_requests"."from_child_id")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"child_id" uuid NOT NULL,
	"friend_child_id" uuid,
	"bot_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "friendships_one_friend" CHECK (("friendships"."friend_child_id" is null) <> ("friendships"."bot_id" is null)),
	CONSTRAINT "friendships_not_self" CHECK ("friendships"."child_id" <> "friendships"."friend_child_id")
);
--> statement-breakpoint
ALTER TABLE "player_blocks" ADD COLUMN "id" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_requests" ADD CONSTRAINT "friend_requests_from_child_id_child_profiles_id_fk" FOREIGN KEY ("from_child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_child_id_child_profiles_id_fk" FOREIGN KEY ("friend_child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_child_from" ON "friend_requests" USING btree ("child_id","from_child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friend_requests_child_bot" ON "friend_requests" USING btree ("child_id","from_bot_id");--> statement-breakpoint
CREATE INDEX "friend_requests_from_idx" ON "friend_requests" USING btree ("from_child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_child_friend" ON "friendships" USING btree ("child_id","friend_child_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_child_bot" ON "friendships" USING btree ("child_id","bot_id");--> statement-breakpoint
CREATE INDEX "friendships_friend_idx" ON "friendships" USING btree ("friend_child_id");--> statement-breakpoint
ALTER TABLE "player_blocks" ADD CONSTRAINT "player_blocks_id_unique" UNIQUE("id");