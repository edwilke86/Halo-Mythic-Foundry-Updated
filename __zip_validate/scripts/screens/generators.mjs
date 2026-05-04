export const generators = [
  /* ---------- STANDALONE TABLES ---------- */

  {
    id: "world-biome",
    name: "Biome Generator",
    category: "World",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    description: "Generates the dominant biome or encounter region.",
    rows: [
      { range: "1", result: "Desert" },
      { range: "2", result: "Jungle / Forest" },
      { range: "3-4", result: "Grassland" },
      { range: "5", result: "Mountains" },
      { range: "6", result: "Coastal" },
      { range: "7-8", result: "Wetland" },
      { range: "9", result: "Valley" },
      { range: "10", result: "Space (Non-Planetary)" },
    ],
  },

  {
    id: "space-type",
    name: "Space Type",
    category: "World",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    description: "Generates the type of space encounter region.",
    rows: [
      { range: "1-3", result: "Empty Space" },
      { range: "4", result: "Asteroids / Meteors" },
      { range: "5", result: "Space Station" },
      { range: "6", result: "Spaceship" },
      { range: "7", result: "Defense Station" },
      { range: "8", result: "Mobile Fleet Platform" },
      { range: "9", result: "Cosmic Dust Clouds" },
      { range: "10", result: "Derelict Satellites or Ship Cemeteries" },
    ],
  },

  {
    id: "space-events",
    name: "Space Events",
    category: "World",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    description: "Generates a major event or hazard in space.",
    rows: [
      { range: "1-6", result: "Clear" },
      { range: "7", result: "Radiation Storm" },
      { range: "8", result: "Micrometeoroid Shower" },
      { range: "9", result: "Cosmic Wind" },
      { range: "10", result: "Geomagnetic Storm" },
    ],
  },

  {
    id: "snow-supplements",
    name: "Snow Supplements",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    description: "Expanded snow conditions.",
    rows: [
      { range: "1", result: "Sleet" },
      { range: "2", result: "Freezing Rain" },
      { range: "3", result: "Heavy Snowfall" },
      { range: "4", result: "Ice Storm" },
      { range: "5", result: "Blowing Snow" },
    ],
  },

  {
    id: "rain-supplements",
    name: "Rain Supplements",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    description: "Expanded rain conditions.",
    rows: [
      { range: "1", result: "Rain Change" },
      { range: "2", result: "Hail" },
      { range: "3", result: "Light Flooding" },
      { range: "4", result: "Calming" },
      { range: "5", result: "Constant Rain" },
    ],
  },

  /* ---------- ENVIRONMENT TABLES ---------- */

  {
    id: "environment-desert",
    name: "Desert Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Tundra" },
      { range: "2", result: "Hot and Dry" },
      { range: "3", result: "Chaparral" },
      { range: "4", result: "Coastal" },
      { range: "5", result: "Mesa" },
    ],
  },

  {
    id: "environment-jungle-forest",
    name: "Jungle/Forest Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Rain Forest" },
      { range: "2", result: "Tropical Jungle" },
      { range: "3", result: "Scrub Forest" },
      { range: "4", result: "Deciduous Forest" },
      { range: "5", result: "Coniferous Forest" },
    ],
  },

  {
    id: "environment-grassland",
    name: "Grassland Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Savanna" },
      { range: "2", result: "Tropical Grassland" },
      { range: "3", result: "Mountain Grassland" },
      { range: "4", result: "Prairie Grassland" },
      { range: "5", result: "Rolling Hills" },
    ],
  },

  {
    id: "environment-mountains",
    name: "Mountain Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Volcanic" },
      { range: "2", result: "Rock" },
      { range: "3", result: "Dome" },
      { range: "4", result: "Plateau" },
      { range: "5", result: "Folded" },
    ],
  },

  {
    id: "environment-coastal",
    name: "Coastal Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Beach" },
      { range: "2", result: "Estuary" },
      { range: "3", result: "Cliffside" },
      { range: "4", result: "Dune" },
      { range: "5", result: "Mud" },
    ],
  },

  {
    id: "environment-wetland",
    name: "Wetland Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Marsh" },
      { range: "2", result: "Wet Meadow" },
      { range: "3", result: "Swamp" },
      { range: "4", result: "Bog" },
      { range: "5", result: "Playa Lakes" },
    ],
  },

  {
    id: "environment-valley",
    name: "Valley Environment",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Gulch" },
      { range: "2", result: "Mountain Cove" },
      { range: "3", result: "Ravine" },
      { range: "4", result: "River Valley" },
      { range: "5", result: "Hanging Valley" },
    ],
  },

  /* ---------- WEATHER TABLES ---------- */

  {
    id: "weather-desert",
    name: "Desert Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Sandstorm" },
      { range: "7", result: "Rain" },
      { range: "8", result: "Heavy Rain" },
      { range: "9", result: "Snowfall (Tundra)" },
      { range: "10", result: "Blizzard (Tundra)" },
    ],
  },

  {
    id: "weather-jungle-forest",
    name: "Jungle/Forest Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Flooding" },
      { range: "9", result: "Monsoon (Rain Forest)" },
      { range: "10", result: "Snowfall (Coniferous/Deciduous)" },
    ],
  },

  {
    id: "weather-grassland",
    name: "Grassland Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Flooding" },
      { range: "9", result: "Snowfall" },
      { range: "10", result: "Blizzard" },
    ],
  },

  {
    id: "weather-mountains",
    name: "Mountain Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Mudslide / Avalanche" },
      { range: "9", result: "Snowfall" },
      { range: "10", result: "Blizzard" },
    ],
  },

  {
    id: "weather-coastal",
    name: "Coastal Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Flooding" },
      { range: "9", result: "Snowfall" },
      { range: "10", result: "Monsoon / Typhoon" },
    ],
  },

  {
    id: "weather-wetland",
    name: "Wetland Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Flooding" },
      { range: "9", result: "Snowfall" },
      { range: "10", result: "Blizzard" },
    ],
  },

  {
    id: "weather-valley",
    name: "Valley Weather",
    category: "Weather",
    source: "Ref: p.332",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-5", result: "Clear" },
      { range: "6", result: "Rain" },
      { range: "7", result: "Heavy Rain" },
      { range: "8", result: "Mudslide / Avalanche" },
      { range: "9", result: "Snowfall" },
      { range: "10", result: "Blizzard" },
    ],
  },
  {
    id: "world-time-of-day",
    name: "Time of Day",
    category: "World",
    source: "Ref: p.333",
    roll: "1d10",
    type: "table",
    description: "Generates the current time of day.",
    rows: [
      { range: "1", result: "Twilight-Dawn" },
      { range: "2", result: "Sunrise" },
      { range: "3-4", result: "Morning" },
      { range: "5", result: "Noon" },
      { range: "6", result: "Evening" },
      { range: "7", result: "Sunset" },
      { range: "8", result: "Twilight-Dusk" },
      { range: "9-10", result: "Night" },
    ],
  },

  {
    id: "world-lighting-modifiers",
    name: "Lighting Modifiers",
    category: "World",
    source: "Ref: p.333",
    roll: "1d5",
    type: "table",
    description: "Generates ambient visibility conditions.",
    rows: [
      { range: "1", result: "Normal Visibility" },
      { range: "2", result: "Blowing Dust and Debris" },
      { range: "3", result: "Fog" },
      { range: "4", result: "Lighting Storm (Flashing Lights)" },
      { range: "5", result: "New Moon (High Levels of Darkness)" },
    ],
  },

  {
    id: "structure-mass",
    name: "Mass Structures",
    category: "Structures",
    source: "Ref: p.333",
    roll: "1d100",
    type: "table",
    description:
      "Generates large-scale settlements, installations, and regional structures.",
    rows: [
      { range: "1-5", result: "Natural (None)" },
      { range: "6-10", result: "Farmland" },
      { range: "11-15", result: "Hamlet" },
      { range: "16-20", result: "Village" },
      { range: "21-25", result: "Town" },
      { range: "26-30", result: "City" },
      { range: "31-35", result: "Metropolis" },
      { range: "36-40", result: "Digsite" },
      { range: "41-45", result: "Forerunner Installation" },
      { range: "46-50", result: "UNSC Military Installation" },
      { range: "51-55", result: "Covenant Military Installation" },
      { range: "56-60", result: "Insurrectionist Military Installation" },
      { range: "61-65", result: "Industrial Complex" },
      { range: "66-70", result: "Banished Installation" },
      { range: "71-75", result: "Created Installation" },
      { range: "76-80", result: "Warehouses" },
      { range: "81-85", result: "National Park" },
      { range: "86-90", result: "Orbital Defense Platform" },
      { range: "91-95", result: "Asteroid Station" },
      { range: "96-100", result: "Megastructure (One Large Building)" },
    ],
  },

  {
    id: "structure-point-of-interest",
    name: "Point of Interest Structures",
    category: "Structures",
    source: "Ref: p.333",
    roll: "1d100",
    type: "table",
    description:
      "Generates a specific point of interest for a mission or event.",
    rows: [
      { range: "1-2", result: "Cave System" },
      { range: "3-4", result: "Military Base" },
      { range: "5-6", result: "Dam or Levee" },
      { range: "7-8", result: "Sparse Civilian Housing" },
      { range: "9-10", result: "Bunker" },
      { range: "11-12", result: "Tunnel System" },
      { range: "13-14", result: "Farms" },
      { range: "15-16", result: "Abandoned Vehicle" },
      { range: "17-18", result: "Battleground" },
      { range: "19-20", result: "Residential Area" },
      { range: "21-22", result: "Mine" },
      { range: "23-24", result: "Skyscraper" },
      { range: "25-26", result: "Frigate or Other Large Ships" },
      { range: "27-28", result: "Hospital" },
      { range: "29-30", result: "Power Plant" },
      { range: "31-32", result: "Airstrip or Airport" },
      { range: "33-34", result: "Church or Community Location" },
      { range: "35-36", result: "Sports Stadium" },
      { range: "37-38", result: "University or College" },
      { range: "39-40", result: "Space Elevator Platform" },
      { range: "41-42", result: "Shipwreck" },
      { range: "43-44", result: "Port" },
      { range: "45-46", result: "Communications Outpost" },
      { range: "47-48", result: "Research Facility" },
      { range: "49-50", result: "Launch Facility" },
      { range: "51-52", result: "Government Facility" },
      { range: "53-54", result: "Weapons Depot" },
      { range: "55-56", result: "Server Farm" },
      { range: "57-58", result: "Barracks" },
      { range: "59-60", result: "Oil or Gas Rig" },
      { range: "61-62", result: "Transportation Hub" },
      { range: "63-64", result: "Forerunner Installation" },
      { range: "65-66", result: "Radio or Television Station" },
      { range: "67-68", result: "Prison" },
      { range: "69-70", result: "Cybersecurity Facility" },
      { range: "71-72", result: "Satellite Ground Station" },
      { range: "73-74", result: "Manufacturing Facility" },
      { range: "75-76", result: "Radar or Observatory Station" },
      { range: "77-78", result: "Mass Driver Station" },
      { range: "79-80", result: "Landfill" },
      { range: "81-82", result: "Seismic Monitoring Station" },
      { range: "83-84", result: "Orbital Defense Generator Facility" },
      { range: "85-86", result: "Pirate or Smuggler's Cove" },
      { range: "87-88", result: "Prefabricated Memory Plastic Cubicle" },
      { range: "89-90", result: "Mobile Generator Facility" },
      { range: "91-92", result: "Expeditionary Firebase or Minibase" },
      { range: "93-94", result: "Watchtower" },
      { range: "95-96", result: "Landing Pad / Supply Pad / Landing Site" },
      { range: "97-98", result: "Museum" },
      { range: "99-100", result: "Vehicle Depot" },
    ],
  },

  {
    id: "structure-location-modifiers",
    name: "Location Modifiers",
    category: "Structures",
    source: "Ref: p.333",
    roll: "1d5",
    type: "table",
    description: "Generates a condition modifier for a generated location.",
    rows: [
      { range: "1", result: "Normal Location, Civilian Presence" },
      { range: "2", result: "Normal Location, Evacuated" },
      { range: "3", result: "Location Used as a Battlefield" },
      { range: "4", result: "Location is Heavily Damaged" },
      { range: "5", result: "Location Glassed or Completely Destroyed" },
    ],
  },
  {
    id: "mission-types",
    name: "Mission Types",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d10",
    type: "table",
    description: "Generates the broad type of military or guerilla mission.",
    rows: [
      { range: "1", result: "Attack" },
      { range: "2", result: "Defense" },
      { range: "3", result: "Patrol" },
      { range: "4", result: "Pursuit" },
      { range: "5", result: "Escort" },
      { range: "6", result: "Recon / Intel" },
      { range: "7", result: "Construction" },
      { range: "8", result: "Survival" },
      { range: "9", result: "Raid" },
      { range: "10", result: "Retrieval" },
    ],
  },

  {
    id: "mission-attack",
    name: "Attack Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d10",
    type: "table",
    description: "Generates a specific attack mission type.",
    rows: [
      {
        range: "1",
        result:
          "Attrition: Wear down the enemy to the point of collapse through loss of personnel and material.",
      },
      {
        range: "2",
        result: "Annihilation: Destroy all enemy military in a planned battle.",
      },
      {
        range: "3",
        result:
          "Investment Siege: Cut off supplies, material, or communications by force.",
      },
      {
        range: "4",
        result:
          "Decapitation: Achieve strategic paralysis by targeting the opponent's political leadership.",
      },
      {
        range: "5",
        result:
          "Exhaustion: Erode the opponents' will and morale to damage overall effectiveness.",
      },
      {
        range: "6",
        result:
          "Interior Lines: Place forces between enemy lines, allowing outer forces to push through more easily.",
      },
      {
        range: "7",
        result:
          "Overwhelming Siege: A constant, unrelenting attack on a single target.",
      },
      {
        range: "8",
        result:
          "Shock and Awe: Demonstrate overwhelming force by sending more than is needed against a single target.",
      },
      {
        range: "9",
        result:
          "Coercion: Attack political or economic centers to manipulate the opponent into acting a desired way.",
      },
      {
        range: "10",
        result:
          "Penetration: Charge past enemy lines to get as deep into enemy territory as possible.",
      },
    ],
  },

  {
    id: "mission-defense",
    name: "Defense Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d10",
    type: "table",
    description: "Generates a specific defense mission type.",
    rows: [
      {
        range: "1",
        result:
          "Boxing Maneuver: Box in an invading force to counterattack from as many sides as possible.",
      },
      {
        range: "2",
        result:
          "Choke Point: Use a strategic chokehold to concentrate opponents into a confined area.",
      },
      {
        range: "3",
        result:
          "Depth Defense: Delay an opposing force to help another force prepare for a proper assault.",
      },
      {
        range: "4",
        result:
          "Fortification: Build or take a structure to gain physical protection against an invading opponent.",
      },
      {
        range: "5",
        result:
          "Fabian: Wear down an enemy through powerful bolstering defense instead of attacking.",
      },
      {
        range: "6",
        result:
          "Military District: Heavily fortified defense structures used as powerful last-defense measures.",
      },
      {
        range: "7",
        result:
          "Scorched Earth: Destroy anything useful to an attacking force while slowly falling back.",
      },
      {
        range: "8",
        result:
          "Turtling: Continuously reinforce until a defense reaches full strength, allowing a powerful counterattack.",
      },
      {
        range: "9",
        result: "Withdrawal: Retreat while maintaining combat with the enemy.",
      },
      {
        range: "10",
        result:
          "Protection: Defend a key individual or group, including political or economic assets. Also covers evacuations.",
      },
    ],
  },

  {
    id: "mission-patrol",
    name: "Patrol Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific patrol mission type.",
    rows: [
      {
        range: "1",
        result:
          "Combat Patrol: A group with sufficient size and power to ambush an enemy across a specific pathway.",
      },
      {
        range: "2",
        result:
          "Clearing Patrol: A brief patrol around newly occupied defensive positions to ensure the area is secure.",
      },
      {
        range: "3",
        result:
          "Standing Patrol: Small static patrols intended to provide early warning, security, or guard duty.",
      },
      {
        range: "4",
        result:
          "Reconnaissance Patrol: A mobile patrol whose main mission is to gather information along a specific pathway.",
      },
      {
        range: "5",
        result:
          "Screening Patrol: A patrol used to observe urban locations in search of possible threats.",
      },
    ],
  },

  {
    id: "mission-pursuit",
    name: "Pursuit Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific pursuit mission type.",
    rows: [
      {
        range: "1",
        result:
          "Individual Assassination: A group is given an objective to pursue a key individual.",
      },
      {
        range: "2",
        result:
          "Backup Pursuit: Groups pursue friendly patrols to provide fast backup in combat.",
      },
      {
        range: "3",
        result:
          "Overrun: Forces overpower an enemy force and move on to the next.",
      },
      {
        range: "4",
        result:
          "Constriction: Force an opposing force into a confined area for termination.",
      },
      {
        range: "5",
        result:
          "Wedge: Pursue an enemy and trick them into wandering between two allied forces.",
      },
    ],
  },

  {
    id: "mission-escort",
    name: "Escort Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific escort mission type.",
    rows: [
      {
        range: "1",
        result:
          "Convoy: Armored groups of vehicles escort key individuals, groups, or equipment.",
      },
      {
        range: "2",
        result:
          "Anti-Ambush: Prepared forces are sent to ensure a known ambush is stopped.",
      },
      {
        range: "3",
        result:
          "Scout: A section of an escorting force scouts ahead to warn the escort team of danger.",
      },
      {
        range: "4",
        result:
          "Overseer: Forces guide units or equipment along the safest available course.",
      },
      {
        range: "5",
        result:
          "Air Superiority: Air units escort forces from afar, usually staying out of opponent range until needed.",
      },
    ],
  },

  {
    id: "mission-recon-intel",
    name: "Recon / Intel Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description:
      "Generates a specific reconnaissance or intelligence mission type.",
    rows: [
      {
        range: "1",
        result:
          "Area: Terrain-oriented mission to find vantage points or possible routes.",
      },
      {
        range: "2",
        result:
          "Civil: Gather broad information about a specific population or race based on social and militaristic operations.",
      },
      {
        range: "3",
        result:
          "Route: Informants watch specific routes and locations such as bridges, landing zones, pickup zones, and roadways.",
      },
      {
        range: "4",
        result:
          "Zone: Scouts obtain detailed information about land, orienting within large areas such as urban districts or military bases.",
      },
      {
        range: "5",
        result:
          "Force: A recon team is sent to scout, but not confront, opposing military forces.",
      },
    ],
  },

  {
    id: "mission-construction",
    name: "Construction Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description:
      "Generates a specific construction or battlefield engineering mission type.",
    rows: [
      {
        range: "1",
        result:
          "Enemy Lines: A small force sneaks behind enemy lines to implant small military bases.",
      },
      {
        range: "2",
        result:
          "Defense Bolster: A team breaks through attacking forces to improve fortifications.",
      },
      {
        range: "3",
        result:
          "Advancement: Forces build or ready bridges, roadways, and other structures for larger forces.",
      },
      {
        range: "4",
        result:
          "Reform: A team alters the use of a structure into something more useful to the military.",
      },
      {
        range: "5",
        result:
          "Artillery: A team flanks or bypasses enemy forces to build and maintain artillery or long-range platform locations.",
      },
    ],
  },

  {
    id: "mission-survival",
    name: "Survival Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific survival mission type.",
    rows: [
      {
        range: "1",
        result:
          "Overwhelmed: Forces are overwhelmed in a firefight and must retreat while fighting to survive.",
      },
      {
        range: "2",
        result:
          "Incoming Forces: Larger enemy forces are arriving, leaving allied forces to prepare a retreat to survive.",
      },
      {
        range: "3",
        result:
          "Key Figure: A team must ensure a key figure survives harsh situations, no matter the cost.",
      },
      {
        range: "4",
        result:
          "Mission Critical: The mission objective is so important that allied forces must do anything necessary to complete it.",
      },
      {
        range: "5",
        result:
          "Guerilla Onslaught: Smaller forces attack larger forces to weaken them before allied backup arrives.",
      },
    ],
  },

  {
    id: "mission-raid",
    name: "Raid Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific raid mission type.",
    rows: [
      {
        range: "1",
        result:
          "Bombardment: Forces counterattack an enemy bombardment or form a bombardment of their own.",
      },
      {
        range: "2",
        result:
          "Landed: Paratroopers and shocktroopers assault ground forces from behind enemy lines before returning to ally-controlled land.",
      },
      {
        range: "3",
        result:
          "Hostile Structure: A specific structure is targeted to be cleared or destroyed as quickly as possible.",
      },
      {
        range: "4",
        result:
          "Raiding Party: Forces catch enemy forces off guard for devastating assaults.",
      },
      {
        range: "5",
        result:
          "Equipment Raid: Forces find and destroy enemy equipment as quickly as possible before retreating.",
      },
    ],
  },

  {
    id: "mission-retrieval",
    name: "Retrieval Missions",
    category: "Missions",
    source: "Ref: p.334",
    roll: "1d5",
    type: "table",
    description: "Generates a specific retrieval mission type.",
    rows: [
      {
        range: "1",
        result:
          "Artifact: Retrieve an artifact from enemy forces, or before enemy forces can retrieve it first.",
      },
      {
        range: "2",
        result:
          "Hostage: Infantry quickly mobilize, infiltrate, and neutralize threats to rescue high-profile targets.",
      },
      {
        range: "3",
        result:
          "Equipment: Retrieve lost or desired equipment from raiding parties and enemy forces.",
      },
      {
        range: "4",
        result:
          "High Profile: Capture a desired high-profile target, such as an enemy political figure.",
      },
      {
        range: "5",
        result:
          "Fortification Retrieval: Military forces recapture fortifications or defensive structures.",
      },
    ],
  },

  {
    id: "encounter-mission-modifiers",
    name: "Encounter and Mission Modifiers",
    category: "Encounters",
    source: "Ref: p.335",
    roll: "1d100",
    type: "table",
    description:
      "Generates mid-mission events, complications, and scenario modifiers.",
    rows: [
      { range: "1-2", result: "Traps have been set for the players." },
      {
        range: "3-4",
        result: "Players come across traps set for someone else.",
      },
      { range: "5-6", result: "Forerunner structure surfaces." },
      { range: "7-8", result: "Traveling enemy patrol arrives." },
      { range: "9-10", result: "Dangerous weather forms." },
      { range: "11-12", result: "Massive EMP device detonated." },
      { range: "13-14", result: "Fake distress call received." },
      { range: "15-16", result: "New distress call received." },
      {
        range: "17-18",
        result: "Location of interest is victim to large detonation.",
      },
      { range: "19-20", result: "Target has fled to a new location." },
      { range: "21-22", result: "Civilian evacuation ordered." },
      { range: "23-24", result: "Encounter dead enemy force." },
      { range: "25-26", result: "New item of interest found." },
      {
        range: "27-28",
        result: "Nuclear device detonation in the far distance.",
      },
      {
        range: "29-30",
        result: "Enemy ambush, or enemy prepared for players.",
      },
      { range: "31-32", result: "Allied reinforcements." },
      {
        range: "33-34",
        result: "Allied military survivors found without weapons.",
      },
      { range: "35-36", result: "Unconscious enemy forces found." },
      { range: "37-38", result: "Heavily wounded enemy forces found." },
      { range: "39-40", result: "Earthquake or other natural disaster." },
      { range: "41-42", result: "Nearby artillery fire without warning." },
      {
        range: "43-44",
        result: "Alert of artillery fire at player location soon.",
      },
      { range: "45-46", result: "Nearby orbital bombardment without warning." },
      {
        range: "47-48",
        result: "Alert of orbital bombardment at player location soon.",
      },
      { range: "49-50", result: "Enemy accidental friendly fire incident." },
      { range: "51-52", result: "Large fires break out." },
      { range: "53-54", result: "Raiding party from enemy faction arrives." },
      { range: "55-56", result: "Nearby orbital glassing." },
      { range: "57-58", result: "Shipwrecks nearby." },
      { range: "59-60", result: "Key ally betrays faction." },
      { range: "61-62", result: "Second opponent joins the battle." },
      { range: "63-64", result: "Allied accidental friendly fire incident." },
      { range: "65-66", result: "Two opposing forces begin fighting nearby." },
      { range: "67-68", result: "Forerunner structure found." },
      { range: "69-70", result: "Opposing dropship jumps in nearby." },
      { range: "71-72", result: "Important new mission at a key point." },
      { range: "73-74", result: "Enemy reinforcements." },
      { range: "75-76", result: "Jammed communications." },
      { range: "77-78", result: "Enemy traitor joins your side." },
      { range: "79-80", result: "Falsified intel received." },
      { range: "81-82", result: "Improved intel received." },
      { range: "83-84", result: "Vehicle depot found." },
      {
        range: "85-86",
        result: "Players' map is incorrect about current location.",
      },
      { range: "87-88", result: "Weapons locker found." },
      { range: "89-90", result: "Undetonated explosives found." },
      { range: "91-92", result: "Trained animals sent after players." },
      { range: "93-94", result: "Wild animals attack players." },
      { range: "95-96", result: "Prisoners found." },
      { range: "97-98", result: "Volcanic eruption." },
      { range: "99-100", result: "Radiation hot zone found." },
    ],
  },
  {
    id: "encounter-opponent-type",
    name: "Encounter Opponent Type",
    category: "Encounters",
    source: "Ref: p.336",
    roll: "1d100",
    type: "table",
    description: "Generates the faction encountered.",
    rows: [
      { range: "1-25", result: "Covenant Forces" },
      { range: "26-50", result: "UNSC Forces" },
      { range: "51-60", result: "Insurrectionist Forces" },
      { range: "61-70", result: "Swords of Sanghelios Forces" },
      { range: "71-80", result: "Banished Forces" },
      { range: "81-90", result: "Forerunner Sentinels" },
      { range: "91-99", result: "Created Forces" },
      { range: "100", result: "Flood Infestation" },
    ],
  },

  {
    id: "encounter-force-type",
    name: "Military Force Encounter Type",
    category: "Encounters",
    source: "Ref: p.336",
    roll: "1d10",
    type: "table",
    description: "Generates the kind of enemy force encountered.",
    rows: [
      { range: "1", result: "Patrol" },
      { range: "2", result: "Recon Team Stalking Party" },
      { range: "3", result: "Strike Force" },
      { range: "4", result: "Heavy Weapons Force" },
      { range: "5", result: "Vehicle Convoy" },
      { range: "6", result: "Sniper Team" },
      { range: "7", result: "Special Forces Team" },
      { range: "8", result: "Shock Troops" },
      { range: "9", result: "Sabotage and Demolitions" },
      { range: "10", result: "Commando Forces" },
    ],
  },

  {
    id: "encounter-force-size",
    name: "Force Encounter Size",
    category: "Encounters",
    source: "Ref: p.336",
    roll: "1d100",
    type: "table",
    description: "Generates approximate opposing force size.",
    rows: [
      { range: "1-60", result: "Fireteam (3–4 Individuals)" },
      { range: "61-85", result: "Squad (8–15 Individuals)" },
      { range: "86-95", result: "Platoon (15–30 Individuals)" },
      { range: "96-99", result: "Company (80–150 Individuals)" },
      { range: "100", result: "Battalion (300–800 Individuals)" },
    ],
  },

  {
    id: "planetary-size",
    name: "Planetary Size",
    category: "Planet",
    source: "Ref: p.336",
    roll: "1d10",
    type: "table",
    description: "Generates rough planetary diameter in kilometers.",
    rows: [
      { range: "1", result: "3,000 km" },
      { range: "2", result: "6,000 km" },
      { range: "3", result: "8,000 km" },
      { range: "4", result: "10,000 km" },
      { range: "5", result: "12,700 km (Earth-sized)" },
      { range: "6", result: "14,000 km" },
      { range: "7", result: "15,000 km" },
      { range: "8", result: "17,000 km" },
      { range: "9", result: "18,000 km" },
      { range: "10", result: "20,000 km" },
    ],
  },

  {
    id: "planet-gravity",
    name: "Gravitational Pull",
    category: "Planet",
    source: "Ref: p.336",
    roll: "1d100",
    type: "table",
    description: "Generates planetary gravity relative to Earth.",
    rows: [
      { range: "1-10", result: "0.25x Gravity (1/4 Earth)" },
      { range: "11-20", result: "0.5x Gravity (1/2 Earth)" },
      { range: "21-50", result: "1x Gravity (Earth)" },
      { range: "51-60", result: "2x Gravity" },
      { range: "61-70", result: "3x Gravity" },
      { range: "71-80", result: "4x Gravity" },
      { range: "81-90", result: "5x Gravity" },
      { range: "91-100", result: "6x Gravity" },
    ],
  },

  {
    id: "planet-atmosphere",
    name: "Planetary Atmosphere",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d5",
    type: "table",
    description: "Generates the planet's atmospheric composition.",
    rows: [
      {
        range: "1",
        result:
          "Oxygen and Nitrogen-based Atmosphere. Earth-like. Grunts can't breathe this.",
      },
      {
        range: "2",
        result:
          "Methane-based. Only Grunts can properly breathe this without dying.",
      },
      {
        range: "3",
        result: "No Atmosphere. This planet has no usable atmosphere.",
      },
      {
        range: "4",
        result:
          "Higher Oxygen Atmosphere. Similar to Earth-like atmospheres, but fires and explosives are much deadlier. Fires travel twice as fast, and explosions and fire deal twice as much Base Damage.",
      },
      {
        range: "5",
        result:
          "Carbon Dioxide or other atmosphere not covered by the chart. Very poisonous to all playable Halo lifeforms, including most animals, unless specified otherwise.",
      },
    ],
  },

  {
    id: "planet-day-length",
    name: "Planetary Day Length",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d100",
    type: "table",
    description: "Generates the planet's average day length in Earth hours.",
    rows: [
      { range: "1-7", result: "1D5+5 Hours" },
      { range: "8-16", result: "1D5+10 Hours" },
      { range: "17-25", result: "1D10+10 Hours" },
      { range: "26-40", result: "2D10+10 Hours" },
      { range: "41-50", result: "3D10+15 Hours" },
      { range: "51-60", result: "4D10+20 Hours" },
      { range: "61-70", result: "5D10+25 Hours" },
      { range: "71-80", result: "6D10+30 Hours" },
      { range: "81-90", result: "7D10+35 Hours" },
      { range: "91-100", result: "10D10+50 Hours" },
    ],
  },

  {
    id: "planet-year-length",
    name: "Planetary Year Length",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d100",
    type: "table",
    description: "Generates the planet's year length in Earth days.",
    rows: [
      { range: "1-7", result: "1D100+50 Days" },
      { range: "8-16", result: "1D100+75 Days" },
      { range: "17-25", result: "2D100+50 Days" },
      { range: "26-40", result: "2D100+75 Days" },
      { range: "41-50", result: "3D100+50 Days" },
      { range: "51-60", result: "3D100+75 Days" },
      { range: "61-70", result: "4D100+50 Days" },
      { range: "71-80", result: "4D100+75 Days" },
      { range: "81-90", result: "5D100+50 Days" },
      { range: "91-100", result: "5D100+75 Days" },
    ],
  },

  {
    id: "planet-water-land-ratio",
    name: "Surface Water to Land Ratio",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d10",
    type: "table",
    description: "Generates the planet's surface water and land ratio.",
    rows: [
      { range: "1", result: "35% Water, 65% Land" },
      { range: "2", result: "40% Water, 60% Land" },
      { range: "3", result: "45% Water, 55% Land" },
      { range: "4", result: "50% Water, 50% Land" },
      { range: "5", result: "55% Water, 45% Land" },
      { range: "6", result: "60% Water, 40% Land" },
      { range: "7", result: "65% Water, 35% Land" },
      { range: "8", result: "70% Water, 30% Land" },
      { range: "9", result: "75% Water, 25% Land" },
      { range: "10", result: "80% Water, 20% Land" },
    ],
  },

  {
    id: "planet-continents",
    name: "Number of Continents on Planet",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d2",
    type: "table",
    description:
      "Reference rolls for major continents and biomes per continent.",
    rows: [
      {
        range: "1",
        result: "Roll 2D5+3 for the number of major continents on the planet.",
      },
      {
        range: "2",
        result: "Roll 1D10 for the number of biomes on each continent.",
      },
    ],
  },

  {
    id: "planet-colonization",
    name: "Colonization Level",
    category: "Planet",
    source: "Ref: p.337",
    roll: "1d10",
    type: "table",
    description:
      "Generates the planet's colonization level and approximate population.",
    rows: [
      { range: "1", result: "Small Outpost (10–100 population)" },
      { range: "2", result: "Large Outpost (100–1,000 population)" },
      { range: "3", result: "Small Settlement (1,000–10,000 population)" },
      { range: "4", result: "Large Settlement (10,000–100,000 population)" },
      {
        range: "5",
        result: "Several Settlements (100,000–500,000 population)",
      },
      { range: "6", result: "Cities (500,000–2,000,000 population)" },
      { range: "7", result: "Metropolises (2,000,000–3,000,000 population)" },
      { range: "8", result: "Conurbation (3,000,000–10,000,000 population)" },
      { range: "9", result: "Megalopolis (10,000,000–100,000,000 population)" },
      {
        range: "10",
        result: "Ecumenopolis (100,000,000–1,000,000,000 population)",
      },
    ],
  },

  {
    id: "npc-race",
    name: "Race",
    category: "NPC",
    source: "Ref: p.337",
    roll: "1d10",
    type: "table",
    description:
      "Generates an NPC race. Depending on setting and location, rolling for race may not be required.",
    rows: [
      { range: "1", result: "Human" },
      { range: "2", result: "Sangheili" },
      { range: "3", result: "Jiralhanae" },
      { range: "4", result: "Unggoy" },
      { range: "5", result: "Kig-Yar" },
      { range: "6", result: "Mgalekgolo" },
      { range: "7", result: "San'Shyuum" },
      { range: "8", result: "Yanme'e" },
      { range: "9", result: "Huragok" },
      { range: "10", result: "Human AI" },
    ],
  },
  {
    id: "npc-human-complexion",
    name: "Human Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d100",
    type: "table",
    rows: [
      { range: "1-15", result: "Pale, Light" },
      { range: "16-36", result: "White, Fair" },
      { range: "37-69", result: "Light Brown" },
      { range: "70-85", result: "Olive, Moderate Brown" },
      { range: "86-90", result: "Brown, Dark Brown" },
      { range: "91-100", result: "Dark Brown, Black" },
    ],
  },

  {
    id: "npc-kig-yar-subspecies",
    name: "Kig-Yar Subspecies",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-4", result: "Ruutian" },
      { range: "5-7", result: "Ibie'Shan" },
      { range: "8-10", result: "T'vaoan" },
    ],
  },

  {
    id: "npc-ruutian-complexion",
    name: "Ruutian Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Light Tan" },
      { range: "2", result: "Tan" },
      { range: "3", result: "Dark Tan" },
      { range: "4", result: "Brown" },
      { range: "5", result: "Dark Brown" },
    ],
  },

  {
    id: "npc-tvaoan-complexion",
    name: "T'vaoan Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Light Gray" },
      { range: "2", result: "Dark Gray" },
      { range: "3", result: "Black" },
      { range: "4", result: "Light Brown" },
      { range: "5", result: "Dark Brown" },
    ],
  },

  {
    id: "npc-ibieshan-complexion",
    name: "Ibie'Shan Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Light Tan" },
      { range: "2", result: "Tan" },
      { range: "3", result: "Beige" },
      { range: "4", result: "Brown" },
      { range: "5", result: "Dark Brown" },
    ],
  },

  {
    id: "npc-sangheili-complexion",
    name: "Sangheili Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Light Gray" },
      { range: "2", result: "Dark Gray" },
      { range: "3", result: "Black" },
      { range: "4", result: "Light Brown" },
      { range: "5", result: "Brown" },
    ],
  },

  {
    id: "npc-jiralhanae-complexion",
    name: "Jiralhanae Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "White" },
      { range: "2", result: "Light Gray" },
      { range: "3", result: "Dark Gray" },
      { range: "4", result: "Brown" },
      { range: "5", result: "Black" },
    ],
  },

  {
    id: "npc-jiralhanae-fur-hair-color",
    name: "Jiralhanae Fur and Hair Color",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Black" },
      { range: "2", result: "Brown" },
      { range: "3", result: "White" },
      { range: "4", result: "Light Gray" },
      { range: "5", result: "Dark Gray" },
    ],
  },

  {
    id: "npc-yanmee-complexion",
    name: "Yanme'e Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1", result: "Gold" },
      { range: "2", result: "Red" },
      { range: "3", result: "Brown" },
      { range: "4", result: "Tan" },
      { range: "5", result: "Gray" },
      { range: "6", result: "Black" },
      { range: "7", result: "Green" },
      { range: "8", result: "Blue" },
      { range: "9", result: "Purple" },
      { range: "10", result: "White" },
    ],
  },

  {
    id: "npc-huragok-complexion",
    name: "Huragok Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "Blue" },
      { range: "2", result: "Pink" },
      { range: "3", result: "Purple" },
      { range: "4", result: "Red" },
      { range: "5", result: "Lavender" },
    ],
  },

  {
    id: "npc-sanshyuum-complexion",
    name: "San'Shyuum Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d100",
    type: "table",
    rows: [
      { range: "1-15", result: "Pale" },
      { range: "16-36", result: "Light Tan" },
      { range: "37-69", result: "Beige" },
      { range: "70-85", result: "Dark Tan" },
      { range: "86-90", result: "Brown" },
      { range: "91-100", result: "Dark Brown" },
    ],
  },

  {
    id: "npc-mgalekgolo-complexion",
    name: "Mgalekgolo Complexion",
    category: "NPC",
    source: "Ref: p.338",
    roll: "1d10",
    type: "table",
    rows: [
      { range: "1-6", result: "Orange" },
      { range: "7-9", result: "Red" },
      { range: "10", result: "Purple" },
    ],
  },

  {
    id: "npc-affiliation",
    name: "Affiliation",
    category: "NPC",
    source: "Ref: p.339",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1", result: "UNSC" },
      { range: "2", result: "Insurrectionist" },
      { range: "3", result: "Covenant" },
      { range: "4", result: "Banished" },
      { range: "5", result: "Neutral" },
    ],
  },

  {
    id: "npc-covenant-factions",
    name: "Covenant Factions",
    category: "NPC",
    source: "Ref: p.339",
    roll: "1d5",
    type: "table",
    rows: [
      { range: "1-2", result: "Covenant Empire" },
      { range: "3", result: "Sword of Sanghelios" },
      { range: "4", result: "Covenant Remnant" },
      { range: "5", result: "Banished" },
    ],
  },

  {
    id: "npc-current-mood",
    name: "NPC Current Mood",
    category: "NPC",
    source: "Ref: p.339",
    roll: "1d100",
    type: "table",
    rows: [
      { range: "1-4", result: "Afraid" },
      { range: "5-8", result: "Angry" },
      { range: "9-12", result: "Annoyed" },
      { range: "13-16", result: "Appreciation" },
      { range: "17-20", result: "Bored" },
      { range: "21-24", result: "Confident" },
      { range: "25-28", result: "Contempt" },
      { range: "29-32", result: "Curious" },
      { range: "33-36", result: "Depressed" },
      { range: "37-40", result: "Disappointed" },
      { range: "41-44", result: "Disgusted" },
      { range: "45-48", result: "Embarrassed" },
      { range: "49-52", result: "Excited" },
      { range: "53-56", result: "Frustrated" },
      { range: "57-60", result: "Happy" },
      { range: "61-64", result: "Interested" },
      { range: "65-68", result: "Jealous" },
      { range: "69-72", result: "Panicked" },
      { range: "73-76", result: "Sad" },
      { range: "77-80", result: "Shame" },
      { range: "81-84", result: "Shy" },
      { range: "85-88", result: "Stressed" },
      { range: "89-92", result: "Surprised" },
      { range: "93-96", result: "Upset" },
      { range: "97-100", result: "Worried" },
    ],
  },

  {
    id: "npc-current-behavior",
    name: "NPC Current Behavior",
    category: "NPC",
    source: "Ref: p.339",
    roll: "1d100",
    type: "table",
    description: "Generates a dominant current behavioral disposition.",
    rows: [
      { range: "1-2", result: "Active: Always busy with something." },
      {
        range: "3-4",
        result: "Aggressive: Verbally or physically threatening.",
      },
      { range: "5-6", result: "Ambitious: Strongly wants to succeed." },
      { range: "7-8", result: "Argumentative: Often arguing with people." },
      { range: "9-10", result: "Assertive: Outgoing and confident." },
      { range: "11-12", result: "Bossy: Always telling people what to do." },
      {
        range: "13-14",
        result: "Careless: Not being careful; rushing into things.",
      },
      { range: "15-16", result: "Caring: Desire to help people." },
      { range: "17-18", result: "Cautious: Being very careful." },
      { range: "19-20", result: "Charming: Pleasant, delightful." },
      {
        range: "21-22",
        result: "Conceited: Arrogant; thinks they are better than others.",
      },
      {
        range: "23-24",
        result: "Conscientious: Takes time to do things right.",
      },
      { range: "25-26", result: "Considerate: Thinking of others." },
      { range: "27-28", result: "Creative: Can make things up easily." },
      { range: "29-30", result: "Curious: Always wanting to know things." },
      {
        range: "31-32",
        result: "Deceitful: Does anything to get what they want.",
      },
      {
        range: "33-34",
        result: "Docile: Submissive; does what they are told.",
      },
      {
        range: "35-36",
        result: "Domineering: Constantly trying to control others.",
      },
      { range: "37-38", result: "Enthusiastic: Has strong feelings; ardent." },
      { range: "39-40", result: "Excitable: Gets excited easily." },
      { range: "41-42", result: "Extroverted: Very outgoing and confident." },
      { range: "43-44", result: "Faithful: Being loyal." },
      { range: "45-46", result: "Funny: Causing people to laugh." },
      { range: "47-48", result: "Impulsive: Acts without thinking first." },
      {
        range: "49-50",
        result: "Inconsiderate: Not caring about others’ feelings.",
      },
      { range: "51-52", result: "Introverted: Keeps to themselves." },
      { range: "53-54", result: "Inventive: Thinks of new ideas." },
      { range: "55-56", result: "Irritating: Bothering people." },
      { range: "57-58", result: "Kind: Thoughtful, caring." },
      { range: "59-60", result: "Lazy: No desire to do things." },
      { range: "61-62", result: "Manic: Acting just a little crazy." },
      {
        range: "63-64",
        result: "Manipulative: Always trying to influence other people.",
      },
      { range: "65-66", result: "Moody: Unpredictable; changing moods often." },
      { range: "67-68", result: "Nervous: Very uncomfortable." },
      {
        range: "69-70",
        result: "Passive: Does not argue; does as they are told.",
      },
      {
        range: "71-72",
        result: "Perfectionist: Wants everything done perfectly.",
      },
      { range: "73-74", result: "Pleasant: Calming to be around." },
      { range: "75-76", result: "Polite: Exhibiting good manners." },
      { range: "77-78", result: "Pragmatic: Always sees the practical side." },
      {
        range: "79-80",
        result: "Reserved: Keeps thoughts and feelings to themself.",
      },
      {
        range: "81-82",
        result: "Rude: Treating people badly; breaking social rules.",
      },
      { range: "83-84", result: "Serious: No-nonsense behavior." },
      {
        range: "85-86",
        result: "Shy: Quiet and reserved; lacking confidence.",
      },
      { range: "87-88", result: "Sincere: Genuine with emotions." },
      { range: "89-90", result: "Spiteful: Seeking revenge." },
      { range: "91-92", result: "Thoughtful: Thinking things over." },
      {
        range: "93-94",
        result: "Thoughtless: Not thinking of effects of actions.",
      },
      { range: "95-96", result: "Trustworthy: Worthy of someone's trust." },
      { range: "97-98", result: "Volatile: Changing moods very quickly." },
      {
        range: "99-100",
        result: "Zealous: Never changing their ways, no matter what.",
      },
    ],
  },
];

export const generatorCategories = [
  "All",
  "World",
  "Weather",
  "Structures",
  "Missions",
  "Encounters",
  "Planet",
  "NPC",
];
