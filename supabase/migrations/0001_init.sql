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
  'Nana''s Sunday Tomato Sauce',
  'Ingredients: 2 cans San Marzano tomatoes, 1 head garlic, fresh basil, olive oil, salt, red pepper flakes. Method: Slowly sauté smashed garlic in generous olive oil until golden. Crush tomatoes by hand into the pan. Simmer uncovered for 45 minutes, stirring occasionally. Finish with torn basil and a pinch of red pepper flakes.',
  'Every Sunday morning I would wake up to the smell of this sauce already bubbling on the stove. Nana started it at 7am no matter what. She said a good sauce needs time and patience — just like a family. She never wrote it down. I had to watch her hands for years before I finally had it.',
  'Maria Conti',
  'https://images.unsplash.com/photo-1555949258-eb67b1ef0ceb?w=800'
),
(
  'a1b2c3d4-0002-0002-0002-000000000002',
  'Dad''s Famous Buttermilk Pancakes',
  'Ingredients: 2 cups flour, 2 tsp baking powder, 1 tsp baking soda, 1/2 tsp salt, 2 tbsp sugar, 2 cups buttermilk, 2 eggs, 4 tbsp melted butter. Method: Whisk dry ingredients. In a separate bowl whisk wet ingredients. Fold together until just combined — lumps are fine. Cook on a medium-hot buttered griddle, flip once bubbles break across the surface.',
  'Saturday mornings belonged to Dad. He would put on an apron and announce "Pancake Day" like it was a national holiday. The whole house smelled like butter and vanilla. We ate them at the kitchen island in our pyjamas, stacked six high, drowned in maple syrup. He is gone now, but every time I make these I am seven years old again.',
  'James Kowalski',
  'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800'
),
(
  'a1b2c3d4-0003-0003-0003-000000000003',
  'Grandma Chen''s Pork Dumplings',
  'Ingredients: 300g ground pork, 2 cups napa cabbage (salted and squeezed), 3 tbsp soy sauce, 1 tbsp sesame oil, 2 tsp fresh ginger, 2 spring onions finely chopped, 40 round dumpling wrappers. Method: Combine filling, place 1 tsp in each wrapper, fold and pleat. Boil in salted water 6–7 minutes or until they float then 2 minutes more.',
  'Every Lunar New Year we gathered around Grandma''s table to fold dumplings together. She would inspect each one and fix our pleats without a word — just redirect our hands. The more dumplings you folded, the more luck you earned for the new year, she said. I still fold them every January, even alone. Especially alone.',
  'Lily Chen',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=800'
),
(
  'a1b2c3d4-0004-0004-0004-000000000004',
  'Aunt Rosa''s Tres Leches Cake',
  'Ingredients: 1 cup flour, 1.5 tsp baking powder, 5 eggs separated, 1 cup sugar, 1/3 cup whole milk, 1 tsp vanilla. Three milks soak: 1 can sweetened condensed milk, 1 can evaporated milk, 1 cup heavy cream. Topping: whipped cream and cinnamon. Method: Make sponge, bake 25 min at 175°C, poke all over, pour soak over warm cake, refrigerate overnight.',
  'Aunt Rosa brought this to every birthday, every quinceañera, every graduation. It was the cake that meant something important was being celebrated. She refused to share the recipe for decades. On her 80th birthday she finally wrote it out for all seven of us nieces on index cards in her looping handwriting. Mine is framed in my kitchen.',
  'Sofia Mendoza',
  'https://images.unsplash.com/photo-1464305795204-6f5bbfc7fb81?w=800'
),
(
  'a1b2c3d4-0005-0005-0005-000000000005',
  'Mum''s Lentil Soup',
  'Ingredients: 2 cups red lentils (rinsed), 1 large onion, 3 cloves garlic, 2 carrots, 1 can crushed tomatoes, 1 tsp cumin, 1 tsp turmeric, 1/2 tsp smoked paprika, 6 cups vegetable stock, lemon juice, olive oil. Method: Sauté onion and garlic in olive oil until soft. Add spices, cook 1 minute. Add lentils, carrots, tomatoes, stock. Simmer 25 minutes. Blend half, return to pot, finish with lemon.',
  'This soup appeared whenever anyone was sad, sick, heartbroken, or cold. Mum would say nothing — she would just put a bowl in front of you. It fixed things. I do not know how. I have made it for friends going through divorces, job losses, grief. They always ask for the recipe. I always tell them it only works if you make it for someone else.',
  'Amara Osei',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800'
)