# DLP precision-routing data audit

Generated 2026-09-11T14:22:24.544Z. ThemeParks.wiki attraction coordinates were compared with a current OpenStreetMap/Overpass extract. A nearby OSM entrance is **not** automatically treated as a verified queue entrance.

## Coverage snapshot

- ThemeParks.wiki: 51 attractions, 51 with coordinates; 52 dining entities, 52 with coordinates.
- OSM: 120 attraction features, 52 dining features, 249 entrance nodes (7 named), 8 station features.
- Candidate guest-walk graph: 1997 ways, 13443 nodes, 74 components. Largest component contains 90% of graph nodes.
- Attraction/OSM name matches: 49/51.
- Entrance evidence: 5 strong same-feature, 14 additional candidates within 25 m, 18 within 60 m, 14 with no entrance node within 60 m.
- Walk graph proximity: 51/51 attraction coordinates within 25 m; 51/51 within 50 m.

## Interpretation

Public data is good enough to move from land-centre routing to attraction-level routing. It is not safe to assume every nearest OSM entrance is the standby queue mouth. Build a curated queue-entrance/exit overlay and use ThemeParks/OSM attraction coordinates only as fallback.

## Strong same-feature entrance evidence
- Avengers Assemble: Flight Force: OSM node 9860326544.
- Indiana Jones™ and the Temple of Peril: OSM node 11420450568.
- Phantom Manor: OSM node 5754835651.
- Frozen Ever After: OSM node 13525630201.
- Ratatouille : L’Aventure Totalement Toquée de Rémy​: OSM node 2893798826.

## Nearby entrance candidates requiring verification
- Disneyland Railroad Frontierland Depot: nearest OSM entrance 1 m (candidate).
- Slinky® Dog Zigzag Spin: nearest OSM entrance 1 m (candidate).
- Casey Jr. – le Petit Train du Cirque: nearest OSM entrance 2 m (candidate).
- Big Thunder Mountain: nearest OSM entrance 2 m (candidate).
- Pirates of the Caribbean: nearest OSM entrance 3 m (candidate).
- Blanche-Neige et les Sept Nains®: nearest OSM entrance 4 m (candidate).
- Autopia, presented by Avis: nearest OSM entrance 5 m (candidate).
- Star Tours: The Adventures Continue*: nearest OSM entrance 7 m (candidate).
- RC Racer: nearest OSM entrance 9 m (candidate).
- Thunder Mesa Riverboat Landing: nearest OSM entrance 13 m (candidate).
- Le Pays des Contes de Fées, presented by Vittel: nearest OSM entrance 14 m (candidate).
- La Cabane des Robinson: nearest OSM entrance 16 m (candidate).
- Les Voyages de Pinocchio: nearest OSM entrance 17 m (candidate).
- Toy Soldiers Parachute Drop: nearest OSM entrance 20 m (candidate).
- Frontierland Playground: nearest OSM entrance 27 m (nearby).
- Le Passage Enchanté d'Aladdin: nearest OSM entrance 27 m (nearby).
- The Twilight Zone Tower of Terror: nearest OSM entrance 27 m (nearby).
- Spider-Man W.E.B. Adventure: nearest OSM entrance 27 m (nearby).
- Les Mystères du Nautilus: nearest OSM entrance 28 m (nearby).
- Orbitron®: nearest OSM entrance 28 m (nearby).
- Disneyland Railroad Discoveryland Station: nearest OSM entrance 28 m (nearby).
- Star Wars Hyperspace Mountain: nearest OSM entrance 31 m (nearby).
- Pirates' Beach: nearest OSM entrance 31 m (nearby).
- Rustler Roundup Shootin' Gallery: nearest OSM entrance 32 m (nearby).
- "it's a small world": nearest OSM entrance 40 m (nearby).
- Pirate Galleon: nearest OSM entrance 50 m (nearby).
- Disneyland Railroad Main Street Station: nearest OSM entrance 51 m (nearby).
- Le Carrousel de Lancelot: nearest OSM entrance 52 m (nearby).
- Disneyland Railroad Main Street Station: nearest OSM entrance 52 m (nearby).
- Mad Hatter's Tea Cups: nearest OSM entrance 57 m (nearby).
- Adventure Isle: nearest OSM entrance 58 m (nearby).
- La Tanière du Dragon: nearest OSM entrance 59 m (nearby).

## No OSM entrance within 60 m
- Horse-Drawn Streetcars: nearest 60 m.
- Cars Quatre Roues Rallye: nearest 61 m.
- Buzz Lightyear Laser Blast: nearest 63 m.
- Peter Pan's Flight: nearest 63 m.
- Disneyland Railroad Fantasyland Station: nearest 65 m.
- La Galerie de la Belle au Bois Dormant: nearest 74 m.
- Main Street Vehicles: nearest 76 m.
- Raiponce Tangled Spin: nearest 79 m.
- Alice's Curious Labyrinth: nearest 80 m.
- Crush's Coaster: nearest 80 m.
- Mickey’s PhilharMagic: nearest 80 m.
- Les Tapis Volants - Flying Carpets Over Agrabah®: nearest 93 m.
- Dumbo the Flying Elephant: nearest 95 m.
- Cars ROAD TRIP: nearest 107 m.

## Attraction coordinates more than 50 m from walk graph
- None.

## Recommended next step
Keep production on v0.5.3. Curate exact queue entrances/exits for the fixed-point restaurants and highest-value rides first, then introduce graph routing behind a feature flag with area-centre fallback.
