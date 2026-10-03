CREATE TABLE "shop_inventory" (
	"child_id" uuid NOT NULL,
	"item_id" text NOT NULL,
	"qty" integer NOT NULL,
	CONSTRAINT "shop_inventory_child_id_item_id_pk" PRIMARY KEY("child_id","item_id"),
	CONSTRAINT "shop_inventory_qty_not_negative" CHECK ("shop_inventory"."qty" >= 0)
);
--> statement-breakpoint
ALTER TABLE "shop_inventory" ADD CONSTRAINT "shop_inventory_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;