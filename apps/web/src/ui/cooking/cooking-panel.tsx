import { useEffect, useState } from 'react';
import { z } from 'zod';
import { type Recipe } from '@miu/schema/cooking';
import { api } from '../api-client';
import { T } from '../i18n/use-t';
import { buttonClass } from '../kit/button';
import './cooking.css';

const RecipesResponse = z.strictObject({
  recipes: z.array(z.custom<Recipe>()),
  ingredients: z.record(z.string(), z.number()),
});

const CookResult = z.strictObject({
  recipe: z.custom<Recipe>(),
  cookedItem: z.strictObject({
    id: z.string(),
    name: z.string(),
    qty: z.number(),
  }),
  message: z.string(),
});

export interface CookingPanelProps {
  onClose?: () => void;
  onCooked?: (recipe: Recipe) => void;
}

export function CookingPanel({ onClose, onCooked }: CookingPanelProps) {
  const [loading, setLoading] = useState(true);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Record<string, number>>({});
  const [cooking, setCooking] = useState<string | null>(null);
  // The server's own line after a dish is cooked, or that it could not be cooked.
  const [feedback, setFeedback] = useState<{ kind: 'server'; text: string } | { kind: 'failed' } | null>(null);

  useEffect(() => {
    let alive = true;
    api('GET', '/cooking/recipes', RecipesResponse)
      .then((res) => {
        if (alive) {
          setRecipes(res.recipes);
          setIngredients(res.ingredients);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function handleCook(recipe: Recipe) {
    if (cooking) return;
    setCooking(recipe.id);
    setFeedback(null);
    try {
      const res = await api('POST', '/cooking/cook', CookResult, { recipeId: recipe.id });
      setFeedback({ kind: 'server', text: res.message });
      // Deduct client-side preview
      setIngredients((prev) => {
        const next = { ...prev };
        for (const ing of recipe.ingredients) {
          const curr = next[ing.itemId];
          if (curr !== undefined) next[ing.itemId] = Math.max(0, curr - ing.qty);
        }
        return next;
      });
      onCooked?.(recipe);
    } catch {
      setFeedback({ kind: 'failed' });
    } finally {
      setCooking(null);
    }
  }

  if (loading) {
    return (
      <div className="cooking-loading">
        <T k="cooking.loading" />
      </div>
    );
  }

  return (
    <div className="cooking-panel" data-id="cooking-panel">
      <header className="cooking-header">
        <span className="cooking-header-icon">🍳</span>
        <div>
          <h3 className="cooking-header-title">
            <T k="cooking.heading" />
          </h3>
          <p className="cooking-header-sub">
            <T k="cooking.lead" />
          </p>
        </div>
      </header>

      {feedback && (
        <div className="cooking-feedback" data-id="cooking-feedback">
          {feedback.kind === 'server' ? feedback.text : <T k="cooking.failed" />}
        </div>
      )}

      <div className="cooking-list" data-id="cooking-recipes-list">
        {recipes.map((r) => {
          const isCookingThis = cooking === r.id;
          return (
            <div key={r.id} className="cooking-card" data-id={`recipe-${r.id}`}>
              <div className="cooking-card-main">
                <div className="cooking-card-info">
                  <h4 className="cooking-card-title">{r.name}</h4>
                  <p className="cooking-card-desc">{r.description}</p>

                  <div className="cooking-ingredients">
                    <span className="cooking-ing-title">
                      <T k="cooking.ingredients" />
                    </span>
                    {r.ingredients.map((ing) => {
                      const owned = ingredients[ing.itemId] ?? 0;
                      const enough = owned >= ing.qty;
                      return (
                        <span key={ing.itemId} className={`cooking-ing-tag ${enough ? 'has-enough' : 'not-enough'}`}>
                          {ing.name} ({owned}/{ing.qty})
                        </span>
                      );
                    })}
                  </div>

                  <div className="cooking-buffs">
                    <span className="cooking-buff-tag buff-hunger">
                      <T k="cooking.hunger" params={{ amount: r.hungerRestore }} />
                    </span>
                    <span className="cooking-buff-tag buff-happy">
                      <T k="cooking.happiness" params={{ amount: r.happinessBonus }} />
                    </span>
                  </div>
                </div>

                <div className="cooking-card-action">
                  <button
                    type="button"
                    className="cooking-btn-cook"
                    data-id={`cook-btn-${r.id}`}
                    disabled={cooking !== null}
                    onClick={() => handleCook(r)}
                  >
                    <T k={isCookingThis ? 'cooking.cooking' : 'cooking.cook'} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {onClose && (
        <button type="button" className={buttonClass('secondary', { block: true })} data-id="cooking-close" onClick={onClose}>
          <T k="cooking.closeKitchen" />
        </button>
      )}
    </div>
  );
}
