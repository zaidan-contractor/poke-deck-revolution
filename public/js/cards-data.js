// ═════════════════════════════════════════════════════════════════
//  Built-in Offline Pokémon Card Database (Fast 0ms Local Cache)
//  Includes authentic cards from Base Set, Scarlet & Violet,
//  Sword & Shield, Sun & Moon, with V, VMAX, VSTAR, GX, EX, & Regular!
// ═════════════════════════════════════════════════════════════════

const BUILTIN_CARDS = [
  // ─── CHARIZARDS ───
  {
    id: "sv3pt5-6",
    name: "Charizard ex",
    hp: 330,
    types: ["Fire"],
    primaryType: "Fire",
    cardType: "ex-lower",
    subtypes: ["Stage 2", "ex"],
    supertype: "Pokémon",
    evolvesFrom: "Charmeleon",
    attacks: [
      {
        name: "Brave Wing",
        cost: ["Fire"],
        convertedEnergyCost: 1,
        damage: 60,
        damageRaw: "60+",
        text: "If this Pokémon has any damage counters on it, this attack does 100 more damage."
      },
      {
        name: "Explosive Vortex",
        cost: ["Fire", "Fire", "Fire", "Colorless"],
        convertedEnergyCost: 4,
        damage: 330,
        damageRaw: "330",
        text: "Discard 3 Energy from this Pokémon."
      }
    ],
    weaknesses: [{ type: "Water", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3pt5/6.png",
      large: "https://images.pokemontcg.io/sv3pt5/6_hires.png"
    },
    set: { id: "sv3pt5", name: "151", series: "Scarlet & Violet" },
    number: "006/165",
    rarity: "Double Rare"
  },
  {
    id: "bw6-85",
    name: "Rayquaza GX",
    hp: 170,
    types: ["Dragon"],
    primaryType: "Dragon",
    cardType: "gx",
    subtypes: ["Basic"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Celestial Roar",
        cost: ["Colorless"],
        convertedEnergyCost: 1,
        damage: 0,
        damageRaw: "0",
        text: "Discard the top 3 cards of your deck. If any of those cards are Energy cards, attach them to this Pokémon."
      },
      {
        name: "Dragon Burst",
        cost: ["Fire", "Lightning"],
        convertedEnergyCost: 2,
        damage: 60,
        damageRaw: "60×",
        text: "Discard all basic Fire Energy or all basic Lightning Energy attached to this Pokémon. This attack does 60 damage times the number of Energy cards you discarded."
      }
    ],
    weaknesses: [{ type: "Dragon", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/bw6/85.png",
      large: "https://images.pokemontcg.io/bw6/85_hires.png"
    },
    set: { id: "bw6", name: "Dragons Exalted", series: "Black & White" },
    number: "85/124",
    rarity: "Rare Holo EX"
  },
  {
    id: "sv3-125",
    name: "Charizard ex",
    hp: 330,
    types: ["Darkness"],
    primaryType: "Darkness",
    cardType: "ex-lower",
    subtypes: ["Stage 2", "Tera", "ex"],
    supertype: "Pokémon",
    evolvesFrom: "Charmeleon",
    attacks: [
      {
        name: "Burning Darkness",
        cost: ["Fire", "Fire"],
        convertedEnergyCost: 2,
        damage: 180,
        damageRaw: "180+",
        text: "This attack does 30 more damage for each Prize card your opponent has taken."
      }
    ],
    abilities: [
      {
        name: "Infernal Reign",
        text: "When you play this Pokémon from your hand to evolve 1 of your Pokémon during your turn, you may search your deck for up to 3 Basic Fire Energy cards and attach them to your Pokémon in any way you like.",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Grass", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3/125.png",
      large: "https://images.pokemontcg.io/sv3/125_hires.png"
    },
    set: { id: "sv3", name: "Obsidian Flames", series: "Scarlet & Violet" },
    number: "125/197",
    rarity: "Double Rare"
  },
  {
    id: "swsh3-20",
    name: "Charizard VMAX",
    hp: 330,
    types: ["Fire"],
    primaryType: "Fire",
    cardType: "vmax",
    subtypes: ["VMAX"],
    supertype: "Pokémon",
    evolvesFrom: "Charizard V",
    attacks: [
      {
        name: "Claw Slash",
        cost: ["Colorless", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 100,
        damageRaw: "100",
        text: ""
      },
      {
        name: "G-Max Wildfire",
        cost: ["Fire", "Fire", "Fire", "Colorless", "Colorless"],
        convertedEnergyCost: 5,
        damage: 300,
        damageRaw: "300",
        text: "Discard 2 Energy from this Pokémon."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Water", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 3,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh3/20.png",
      large: "https://images.pokemontcg.io/swsh3/20_hires.png"
    },
    set: { id: "swsh3", name: "Darkness Ablaze", series: "Sword & Shield" },
    number: "020/189",
    rarity: "Rare Holo VMAX"
  },
  {
    id: "sm3-20",
    name: "Charizard-GX",
    hp: 250,
    types: ["Fire"],
    primaryType: "Fire",
    cardType: "gx",
    subtypes: ["Stage 2", "GX"],
    supertype: "Pokémon",
    evolvesFrom: "Charmeleon",
    attacks: [
      {
        name: "Wing Attack",
        cost: ["Colorless", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 70,
        damageRaw: "70",
        text: ""
      },
      {
        name: "Crimson Storm",
        cost: ["Fire", "Fire", "Fire", "Colorless", "Colorless"],
        convertedEnergyCost: 5,
        damage: 300,
        damageRaw: "300",
        text: "Discard 3 Fire Energy from this Pokémon."
      },
      {
        name: "Raging Out-GX",
        cost: ["Fire", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 0,
        damageRaw: "GX",
        isGX: true,
        text: "Discard the top 10 cards of your opponent's deck. (You can't use more than 1 GX attack in a game.)"
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Water", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: {
      type: "gx",
      attack: {
        name: "Raging Out-GX",
        damage: "0",
        text: "Discard the top 10 cards of your opponent's deck."
      }
    },
    images: {
      small: "https://images.pokemontcg.io/sm3/20.png",
      large: "https://images.pokemontcg.io/sm3/20_hires.png"
    },
    set: { id: "sm3", name: "Burning Shadows", series: "Sun & Moon" },
    number: "20/147",
    rarity: "Rare Holo GX"
  },
  {
    id: "base1-4",
    name: "Charizard",
    hp: 120,
    types: ["Fire"],
    primaryType: "Fire",
    cardType: "regular",
    subtypes: ["Stage 2"],
    supertype: "Pokémon",
    evolvesFrom: "Charmeleon",
    attacks: [
      {
        name: "Fire Spin",
        cost: ["Fire", "Fire", "Fire", "Fire"],
        convertedEnergyCost: 4,
        damage: 100,
        damageRaw: "100",
        text: "Discard 2 Energy cards attached to Charizard in order to use this attack."
      }
    ],
    abilities: [
      {
        name: "Energy Burn",
        text: "As often as you like during your turn (before your attack), you may turn all Energy attached to Charizard into Fire Energy for the rest of the turn. This power can't be used if Charizard is Asleep, Confused, or Paralyzed.",
        type: "Pokémon Power"
      }
    ],
    weaknesses: [{ type: "Water", value: "×2" }],
    resistances: [{ type: "Fighting", value: "-30" }],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/base1/4.png",
      large: "https://images.pokemontcg.io/base1/4_hires.png"
    },
    set: { id: "base1", name: "Base", series: "Base" },
    number: "4/102",
    rarity: "Rare Holo"
  },
  {
    id: "pgo-11",
    name: "Radiant Charizard",
    hp: 160,
    types: ["Fire"],
    primaryType: "Fire",
    cardType: "regular",
    subtypes: ["Basic", "Radiant"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Combustion Blast",
        cost: ["Fire", "Colorless", "Colorless", "Colorless", "Colorless"],
        convertedEnergyCost: 5,
        damage: 250,
        damageRaw: "250",
        text: "During your next turn, this Pokémon can't use Combustion Blast."
      }
    ],
    abilities: [
      {
        name: "Excited Heart",
        text: "This Pokémon's attacks cost Colorless less for each Prize card your opponent has taken.",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Water", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/pgo/11.png",
      large: "https://images.pokemontcg.io/pgo/11_hires.png"
    },
    set: { id: "pgo", name: "Pokémon GO", series: "Sword & Shield" },
    number: "011/078",
    rarity: "Radiant Rare"
  },

  // ─── PIKACHUS ───
  {
    id: "sv3pt5-25",
    name: "Pikachu",
    hp: 60,
    types: ["Lightning"],
    primaryType: "Lightning",
    cardType: "regular",
    subtypes: ["Basic"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Charge",
        cost: ["Lightning"],
        convertedEnergyCost: 1,
        damage: 0,
        damageRaw: "0",
        text: "Search your deck for a Basic Lightning Energy card and attach it to this Pokémon."
      },
      {
        name: "Pika Punch",
        cost: ["Lightning", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 50,
        damageRaw: "50",
        text: ""
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3pt5/25.png",
      large: "https://images.pokemontcg.io/sv3pt5/25_hires.png"
    },
    set: { id: "sv3pt5", name: "151", series: "Scarlet & Violet" },
    number: "025/165",
    rarity: "Common"
  },
  {
    id: "basep-1",
    name: "Pikachu",
    hp: 60,
    types: ["Lightning"],
    primaryType: "Lightning",
    cardType: "regular",
    subtypes: ["Basic"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Growl",
        cost: ["Colorless"],
        convertedEnergyCost: 1,
        damage: 0,
        damageRaw: "0",
        text: "If the Defending Pokémon attacks Pikachu during your opponent's next turn, any damage done by the attack is reduced by 10."
      },
      {
        name: "Thundershock",
        cost: ["Lightning", "Lightning"],
        convertedEnergyCost: 2,
        damage: 20,
        damageRaw: "20",
        text: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/basep/1.png",
      large: "https://images.pokemontcg.io/basep/1_hires.png"
    },
    set: { id: "basep", name: "Wizards Black Star Promos", series: "Base" },
    number: "1",
    rarity: "Promo"
  },
  {
    id: "swsh9-43",
    name: "Pikachu V",
    hp: 190,
    types: ["Lightning"],
    primaryType: "Lightning",
    cardType: "v",
    subtypes: ["Basic", "V"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Lightning Bomb",
        cost: ["Lightning", "Colorless"],
        convertedEnergyCost: 2,
        damage: 100,
        damageRaw: "100",
        text: "This attack also does 30 damage to 1 of your Benched Pokémon."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh9/43.png",
      large: "https://images.pokemontcg.io/swsh9/43_hires.png"
    },
    set: { id: "swsh9", name: "Brilliant Stars", series: "Sword & Shield" },
    number: "043/172",
    rarity: "Rare Holo V"
  },
  {
    id: "swsh4-44",
    name: "Pikachu VMAX",
    hp: 310,
    types: ["Lightning"],
    primaryType: "Lightning",
    cardType: "vmax",
    subtypes: ["VMAX"],
    supertype: "Pokémon",
    evolvesFrom: "Pikachu V",
    attacks: [
      {
        name: "Tail Whap",
        cost: ["Lightning"],
        convertedEnergyCost: 1,
        damage: 30,
        damageRaw: "30",
        text: ""
      },
      {
        name: "G-Max Volt Tackle",
        cost: ["Lightning", "Lightning", "Lightning"],
        convertedEnergyCost: 3,
        damage: 120,
        damageRaw: "120+",
        text: "You may discard all Energy from this Pokémon. If you do, this attack does 150 more damage."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 3,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh4/44.png",
      large: "https://images.pokemontcg.io/swsh4/44_hires.png"
    },
    set: { id: "swsh4", name: "Vivid Voltage", series: "Sword & Shield" },
    number: "044/185",
    rarity: "Rare Holo VMAX"
  },

  // ─── MEWTWO ───
  {
    id: "sm11-71",
    name: "Mewtwo & Mew-GX",
    hp: 270,
    types: ["Psychic"],
    primaryType: "Psychic",
    cardType: "gx",
    subtypes: ["Basic", "TAG TEAM", "GX"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Miraculous Duo-GX",
        cost: ["Psychic", "Psychic", "Colorless"],
        convertedEnergyCost: 3,
        damage: 200,
        damageRaw: "200",
        isGX: true,
        text: "If this Pokémon has at least 1 extra Energy attached to it, heal all damage from all of your Pokémon."
      }
    ],
    abilities: [
      {
        name: "Perfection",
        text: "This Pokémon can use the attacks of any Pokémon-GX or Pokémon-EX on your Bench or in your discard pile.",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Psychic", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 3,
    specialPower: {
      type: "gx",
      attack: {
        name: "Miraculous Duo-GX",
        damage: "200",
        text: "Heal all damage from all of your Pokémon if extra energy attached."
      }
    },
    images: {
      small: "https://images.pokemontcg.io/sm11/71.png",
      large: "https://images.pokemontcg.io/sm11/71_hires.png"
    },
    set: { id: "sm11", name: "Unified Minds", series: "Sun & Moon" },
    number: "71/236",
    rarity: "Rare Holo GX"
  },
  {
    id: "sm35-39",
    name: "Mewtwo-GX",
    hp: 190,
    types: ["Psychic"],
    primaryType: "Psychic",
    cardType: "gx",
    subtypes: ["Basic", "GX"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Full Burst",
        cost: ["Psychic"],
        convertedEnergyCost: 1,
        damage: 30,
        damageRaw: "30×",
        text: "This attack does 30 damage times the amount of Energy attached to this Pokémon."
      },
      {
        name: "Super Absorption",
        cost: ["Psychic", "Colorless"],
        convertedEnergyCost: 2,
        damage: 60,
        damageRaw: "60",
        text: "Heal 30 damage from this Pokémon."
      },
      {
        name: "Psystrike-GX",
        cost: ["Psychic", "Psychic", "Psychic"],
        convertedEnergyCost: 3,
        damage: 200,
        damageRaw: "200",
        isGX: true,
        text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Psychic", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: {
      type: "gx",
      attack: {
        name: "Psystrike-GX",
        damage: "200",
        text: "Damage isn't affected by any effects on Defending Pokémon."
      }
    },
    images: {
      small: "https://images.pokemontcg.io/sm35/39.png",
      large: "https://images.pokemontcg.io/sm35/39_hires.png"
    },
    set: { id: "sm35", name: "Shining Legends", series: "Sun & Moon" },
    number: "39/73",
    rarity: "Rare Holo GX"
  },

  // ─── RAYQUAZA ───
  {
    id: "swsh7-111",
    name: "Rayquaza VMAX",
    hp: 320,
    types: ["Dragon"],
    primaryType: "Dragon",
    cardType: "vmax",
    subtypes: ["VMAX", "Rapid Strike"],
    supertype: "Pokémon",
    evolvesFrom: "Rayquaza V",
    attacks: [
      {
        name: "Max Burst",
        cost: ["Fire", "Lightning"],
        convertedEnergyCost: 2,
        damage: 20,
        damageRaw: "20+",
        text: "You may discard any amount of basic Fire Energy or basic Lightning Energy from this Pokémon. This attack does 80 more damage for each card you discarded in this way."
      }
    ],
    abilities: [
      {
        name: "Azure Pulse",
        text: "Once during your turn, you may discard your hand and draw 3 cards.",
        type: "Ability"
      }
    ],
    weaknesses: [],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 3,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh7/111.png",
      large: "https://images.pokemontcg.io/swsh7/111_hires.png"
    },
    set: { id: "swsh7", name: "Evolving Skies", series: "Sword & Shield" },
    number: "111/203",
    rarity: "Rare Holo VMAX"
  },

  // ─── LUCARIO ───
  {
    id: "swsh12pt5-79",
    name: "Lucario VSTAR",
    hp: 270,
    types: ["Fighting"],
    primaryType: "Fighting",
    cardType: "vstar",
    subtypes: ["VSTAR"],
    supertype: "Pokémon",
    evolvesFrom: "Lucario V",
    attacks: [
      {
        name: "Fighting Knuckle",
        cost: ["Fighting", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 120,
        damageRaw: "120+",
        text: "If your opponent's Active Pokémon is a Pokémon V, this attack does 120 more damage."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Psychic", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: {
      type: "vstar-attack",
      attack: {
        name: "Aura Star (VSTAR Power)",
        cost: ["Fighting", "Colorless"],
        damage: 70,
        damageRaw: "70×",
        isVSTAR: true,
        text: "This attack does 70 damage for each Energy attached to all of your opponent's Pokémon. (You can't use more than 1 VSTAR Power in a game.)"
      }
    },
    images: {
      small: "https://images.pokemontcg.io/swsh12pt5/79.png",
      large: "https://images.pokemontcg.io/swsh12pt5/79_hires.png"
    },
    set: { id: "swsh12pt5", name: "Crown Zenith", series: "Sword & Shield" },
    number: "079/159",
    rarity: "Rare Holo VSTAR"
  },

  // ─── GENGAR ───
  {
    id: "swsh8-157",
    name: "Gengar VMAX",
    hp: 320,
    types: ["Darkness"],
    primaryType: "Darkness",
    cardType: "vmax",
    subtypes: ["VMAX", "Single Strike"],
    supertype: "Pokémon",
    evolvesFrom: "Gengar V",
    attacks: [
      {
        name: "Fear and Panic",
        cost: ["Darkness", "Darkness"],
        convertedEnergyCost: 2,
        damage: 60,
        damageRaw: "60×",
        text: "This attack does 60 damage for each of your opponent's Pokémon V and Pokémon-GX in play."
      },
      {
        name: "G-Max Swallow Up",
        cost: ["Darkness", "Darkness", "Darkness"],
        convertedEnergyCost: 3,
        damage: 250,
        damageRaw: "250",
        text: "During your next turn, this Pokémon can't attack."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 3,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh8/157.png",
      large: "https://images.pokemontcg.io/swsh8/157_hires.png"
    },
    set: { id: "swsh8", name: "Fusion Strike", series: "Sword & Shield" },
    number: "157/264",
    rarity: "Rare Holo VMAX"
  },

  // ─── LUGIA VSTAR ───
  {
    id: "swsh12-139",
    name: "Lugia VSTAR",
    hp: 280,
    types: ["Colorless"],
    primaryType: "Colorless",
    cardType: "vstar",
    subtypes: ["VSTAR"],
    supertype: "Pokémon",
    evolvesFrom: "Lugia V",
    attacks: [
      {
        name: "Tempest Dive",
        cost: ["Colorless", "Colorless", "Colorless", "Colorless"],
        convertedEnergyCost: 4,
        damage: 220,
        damageRaw: "220",
        text: "You may discard a Stadium in play."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Lightning", value: "×2" }],
    resistances: [{ type: "Fighting", value: "-30" }],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: {
      type: "vstar-ability",
      ability: {
        name: "Summoning Star (VSTAR Power)",
        text: "During your turn, you may put up to 2 Colorless Pokémon that don't have a Rule Box from your discard pile onto your Bench."
      }
    },
    images: {
      small: "https://images.pokemontcg.io/swsh12/139.png",
      large: "https://images.pokemontcg.io/swsh12/139_hires.png"
    },
    set: { id: "swsh12", name: "Silver Tempest", series: "Sword & Shield" },
    number: "139/195",
    rarity: "Rare Holo VSTAR"
  },

  // ─── GIRATINA VSTAR ───
  {
    id: "swsh11-131",
    name: "Giratina VSTAR",
    hp: 280,
    types: ["Dragon"],
    primaryType: "Dragon",
    cardType: "vstar",
    subtypes: ["VSTAR"],
    supertype: "Pokémon",
    evolvesFrom: "Giratina V",
    attacks: [
      {
        name: "Lost Impact",
        cost: ["Grass", "Psychic", "Colorless"],
        convertedEnergyCost: 3,
        damage: 280,
        damageRaw: "280",
        text: "Put 2 Energy attached to your Pokémon into the Lost Zone."
      }
    ],
    abilities: [],
    weaknesses: [],
    resistances: [],
    retreatCost: ["Colorless", "Colorless"],
    convertedRetreatCost: 2,
    prizeCards: 2,
    specialPower: {
      type: "vstar-attack",
      attack: {
        name: "Star Requiem (VSTAR Power)",
        cost: ["Grass", "Psychic"],
        damage: 999,
        damageRaw: "KO",
        isVSTAR: true,
        text: "You can use this attack only if you have 10 or more cards in the Lost Zone. Your opponent's Active Pokémon is Knocked Out."
      }
    },
    images: {
      small: "https://images.pokemontcg.io/swsh11/131.png",
      large: "https://images.pokemontcg.io/swsh11/131_hires.png"
    },
    set: { id: "swsh11", name: "Lost Origin", series: "Sword & Shield" },
    number: "131/196",
    rarity: "Rare Holo VSTAR"
  },

  // ─── BLASTOISE EX ───
  {
    id: "sv3pt5-9",
    name: "Blastoise ex",
    hp: 330,
    types: ["Water"],
    primaryType: "Water",
    cardType: "ex-lower",
    subtypes: ["Stage 2", "ex"],
    supertype: "Pokémon",
    evolvesFrom: "Wartortle",
    attacks: [
      {
        name: "Twin Cannons",
        cost: ["Water", "Water"],
        convertedEnergyCost: 2,
        damage: 140,
        damageRaw: "140×",
        text: "Discard up to 2 Basic Water Energy cards from your hand. This attack does 140 damage for each card you discarded in this way."
      }
    ],
    abilities: [
      {
        name: "Solid Shell",
        text: "This Pokémon takes 30 less damage from attacks (after applying Weakness and Resistance).",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Lightning", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3pt5/9.png",
      large: "https://images.pokemontcg.io/sv3pt5/9_hires.png"
    },
    set: { id: "sv3pt5", name: "151", series: "Scarlet & Violet" },
    number: "009/165",
    rarity: "Double Rare"
  },

  // ─── VENUSAUR EX ───
  {
    id: "sv3pt5-3",
    name: "Venusaur ex",
    hp: 340,
    types: ["Grass"],
    primaryType: "Grass",
    cardType: "ex-lower",
    subtypes: ["Stage 2", "ex"],
    supertype: "Pokémon",
    evolvesFrom: "Ivysaur",
    attacks: [
      {
        name: "Giant Bloom",
        cost: ["Grass", "Grass", "Colorless"],
        convertedEnergyCost: 3,
        damage: 150,
        damageRaw: "150",
        text: "Heal 60 damage from this Pokémon."
      }
    ],
    abilities: [
      {
        name: "Tranquil Flower",
        text: "Once during your turn, if this Pokémon is in the Active Spot, you may heal 60 damage from 1 of your Pokémon.",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Fire", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 4,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3pt5/3.png",
      large: "https://images.pokemontcg.io/sv3pt5/3_hires.png"
    },
    set: { id: "sv3pt5", name: "151", series: "Scarlet & Violet" },
    number: "003/165",
    rarity: "Double Rare"
  },

  // ─── GRENINJA EX ───
  {
    id: "sv6-106",
    name: "Greninja ex",
    hp: 310,
    types: ["Fighting"],
    primaryType: "Fighting",
    cardType: "ex-lower",
    subtypes: ["Stage 2", "Tera", "ex"],
    supertype: "Pokémon",
    evolvesFrom: "Frogadier",
    attacks: [
      {
        name: "Shinobi Blade",
        cost: ["Water"],
        convertedEnergyCost: 1,
        damage: 170,
        damageRaw: "170",
        text: "You may search your deck for any 1 card and put it into your hand."
      },
      {
        name: "Mirage Barrage",
        cost: ["Water", "Colorless", "Colorless"],
        convertedEnergyCost: 3,
        damage: 120,
        damageRaw: "120",
        text: "Discard 2 Energy from this Pokémon. This attack does 120 damage to 2 of your opponent's Pokémon."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Psychic", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv6/106.png",
      large: "https://images.pokemontcg.io/sv6/106_hires.png"
    },
    set: { id: "sv6", name: "Twilight Masquerade", series: "Scarlet & Violet" },
    number: "106/167",
    rarity: "Double Rare"
  },

  // ─── MIRAIDON EX ───
  {
    id: "sv1-81",
    name: "Miraidon ex",
    hp: 220,
    types: ["Lightning"],
    primaryType: "Lightning",
    cardType: "ex-lower",
    subtypes: ["Basic", "ex"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Photon Blaster",
        cost: ["Lightning", "Lightning", "Colorless"],
        convertedEnergyCost: 3,
        damage: 220,
        damageRaw: "220",
        text: "During your next turn, this Pokémon can't attack."
      }
    ],
    abilities: [
      {
        name: "Tandem Unit",
        text: "Once during your turn, you may search your deck for up to 2 Basic Lightning Pokémon and put them onto your Bench.",
        type: "Ability"
      }
    ],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv1/81.png",
      large: "https://images.pokemontcg.io/sv1/81_hires.png"
    },
    set: { id: "sv1", name: "Scarlet & Violet", series: "Scarlet & Violet" },
    number: "081/198",
    rarity: "Double Rare"
  },

  // ─── DRAGONITE V ───
  {
    id: "swsh7-192",
    name: "Dragonite V",
    hp: 230,
    types: ["Dragon"],
    primaryType: "Dragon",
    cardType: "v",
    subtypes: ["Basic", "V"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Shred",
        cost: ["Water", "Lightning"],
        convertedEnergyCost: 2,
        damage: 50,
        damageRaw: "50",
        text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon."
      },
      {
        name: "Dragon Gale",
        cost: ["Water", "Water", "Lightning"],
        convertedEnergyCost: 3,
        damage: 250,
        damageRaw: "250",
        text: "This attack also does 20 damage to each of your Benched Pokémon."
      }
    ],
    abilities: [],
    weaknesses: [],
    resistances: [],
    retreatCost: ["Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 3,
    prizeCards: 2,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/swsh7/192.png",
      large: "https://images.pokemontcg.io/swsh7/192_hires.png"
    },
    set: { id: "swsh7", name: "Evolving Skies", series: "Sword & Shield" },
    number: "192/203",
    rarity: "Ultra Rare"
  },

  // ─── SNORLAX ───
  {
    id: "base1-11",
    name: "Snorlax",
    hp: 90,
    types: ["Colorless"],
    primaryType: "Colorless",
    cardType: "regular",
    subtypes: ["Basic"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Body Slam",
        cost: ["Colorless", "Colorless", "Colorless", "Colorless"],
        convertedEnergyCost: 4,
        damage: 30,
        damageRaw: "30",
        text: "Flip a coin. If heads, the Defending Pokémon is now Paralyzed."
      }
    ],
    abilities: [
      {
        name: "Thick Skinned",
        text: "Snorlax can't become Asleep, Confused, Paralyzed, or Poisoned. This power can't be used if Snorlax is already affected by a Special Condition.",
        type: "Pokémon Power"
      }
    ],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [{ type: "Psychic", value: "-30" }],
    retreatCost: ["Colorless", "Colorless", "Colorless", "Colorless"],
    convertedRetreatCost: 4,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/base1/11.png",
      large: "https://images.pokemontcg.io/base1/11_hires.png"
    },
    set: { id: "base1", name: "Base", series: "Base" },
    number: "11/64",
    rarity: "Rare Holo"
  },

  // ─── EEVEE ───
  {
    id: "sv3pt5-133",
    name: "Eevee",
    hp: 50,
    types: ["Colorless"],
    primaryType: "Colorless",
    cardType: "regular",
    subtypes: ["Basic"],
    supertype: "Pokémon",
    evolvesFrom: null,
    attacks: [
      {
        name: "Colorful Friends",
        cost: ["Colorless"],
        convertedEnergyCost: 1,
        damage: 0,
        damageRaw: "0",
        text: "Search your deck for up to 3 Pokémon of different types, reveal them, and put them into your hand."
      },
      {
        name: "Step Dash",
        cost: ["Colorless", "Colorless"],
        convertedEnergyCost: 2,
        damage: 30,
        damageRaw: "30",
        text: "Flip a coin. If tails, this attack does nothing."
      }
    ],
    abilities: [],
    weaknesses: [{ type: "Fighting", value: "×2" }],
    resistances: [],
    retreatCost: ["Colorless"],
    convertedRetreatCost: 1,
    prizeCards: 1,
    specialPower: null,
    images: {
      small: "https://images.pokemontcg.io/sv3pt5/133.png",
      large: "https://images.pokemontcg.io/sv3pt5/133_hires.png"
    },
    set: { id: "sv3pt5", name: "151", series: "Scarlet & Violet" },
    number: "133/165",
    rarity: "Common"
  }
];

// Helper: Common Pokémon names for fuzzy OCR matching
const COMMON_POKEMON_NAMES = [
  "Charizard", "Pikachu", "Mewtwo", "Rayquaza", "Lucario", "Gengar", "Lugia",
  "Giratina", "Arceus", "Blastoise", "Venusaur", "Greninja", "Miraidon", "Koraidon",
  "Eevee", "Umbreon", "Espeon", "Sylveon", "Garchomp", "Tyranitar", "Dragonite",
  "Snorlax", "Mew", "Dialga", "Palkia", "Gardevoir", "Roaring Moon", "Iron Valiant",
  "Squirtle", "Charmander", "Bulbasaur", "Raichu", "Machamp", "Alakazam", "Gyarados",
  "Lapras", "Zapdos", "Moltres", "Articuno", "Ditto", "Jogress", "Baxcalibur"
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BUILTIN_CARDS, COMMON_POKEMON_NAMES };
}
