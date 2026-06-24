create table if not exists recipe_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  recipe_title text not null,
  recipe_details text not null,
  memory_story text not null,
  author_name text not null,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table recipe_memories enable row level security;

drop policy if exists "recipe_memories_v1_read" on recipe_memories;
create policy "recipe_memories_v1_read" on recipe_memories for select using (true);

drop policy if exists "recipe_memories_v1_write" on recipe_memories;
create policy "recipe_memories_v1_write" on recipe_memories for all using (true) with check (true);

insert into recipe_memories (id, recipe_title, recipe_details, memory_story, author_name, photo_url) values
(
  'a1b2c3d4-0001-0001-0001-000000000001',
  'Nonna''s Sunday Ragù',
  'Ingredients: 500g beef mince, 1 onion, 2 cloves garlic, 400g crushed tomatoes, 1 glass red wine, fresh basil, salt, olive oil. Method: Sauté onion and garlic in olive oil until soft. Brown the mince. Add wine and let it reduce. Add tomatoes, season, simmer on lowest heat for 3 hours. Finish with torn basil. Serve over rigatoni with Parmigiano.',
  'Every Sunday morning the smell of this ragù meant family was coming. Nonna would start it after church and by the time we arrived the whole building smelled of it. She always said the secret was patience — and a little more wine in the pot than in the recipe.',
  'Maria Conti',
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800'
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Dad''s Lemon Drizzle Cake',
  'Ingredients: 225g butter, 225g caster sugar, 4 eggs, 225g self-raising flour, zest of 2 lemons. Drizzle: juice of 2 lemons, 85g caster sugar. Method: Cream butter and sugar, beat in eggs, fold in flour and zest. Bake 160°C for 45 min. While warm, mix juice and sugar and pour over cake.',
  'Dad made this every year for our birthdays without fail, even after he retired and forgot most things. He never needed the recipe card — his hands just knew. We found the original card in his handwriting tucked inside his copy of Delia Smith. It smelled like lemon.',
  'James Whitfield',
  'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?w=800'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Grandma''s Chicken Adobo',
  'Ingredients: 1kg chicken pieces, ½ cup soy sauce, ½ cup white vinegar, 1 head garlic (crushed), 3 bay leaves, 1 tsp black peppercorns. Method: Combine all in a pot. Marinate 30 min. Bring to boil, then simmer uncovered 30 min until sauce reduces and chicken browns slightly in its own fat.',
  'This is the dish that tells me I am home no matter where I am. Grandma made it for every goodbye and every homecoming. The smell hits before you open the door. My cousins and I once tried to recreate it in a London flat at midnight. It was not the same, but we cried and laughed anyway.',
  'Ana Reyes',
  'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=800'
),
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Mum''s Shortbread',
  'Ingredients: 150g plain flour, 100g butter (cold, cubed), 50g caster sugar, pinch of salt. Method: Rub butter into flour until breadcrumbs form. Stir in sugar and salt. Press into a tin, prick with a fork. Bake 150°C for 30–35 min until pale gold. Cut while warm, cool in tin.',
  'Three ingredients and 35 minutes. Mum said shortbread was proof that simple things done well are always enough. She brought a tin of it to every neighbour who had a new baby, a bereavement, or a hard week. Half the street has this recipe now — she gave it freely to anyone who asked.',
  'Fiona MacLeod',
  'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=800'
);