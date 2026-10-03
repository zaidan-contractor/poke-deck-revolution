// ═══════════════════════════════════════════════
//  Battle Engine — TCG Rules, GBA Feel
// ═══════════════════════════════════════════════

const BattleEngine = (() => {
  // ─── Game State ───
  let state = null;

  const MODES = {
    quick:    { partySize: 3, prizes: 2, name: 'Quick Battle' },
    standard: { partySize: 6, prizes: 4, name: 'Standard' },
    boss:     { partySize: 1, prizes: 0, name: 'Boss Battle' },
    draft:    { partySize: 4, prizes: 3, name: 'Draft' }
  };

  // ─── Initialize Battle ───
  function initBattle(p1Team, p2Team, mode) {
    const modeConfig = MODES[mode] || MODES.standard;

    state = {
      mode: mode,
      modeConfig: modeConfig,
      turn: 1, // 1 or 2
      turnCount: 0,
      phase: 'setup', // setup, action, attack-anim, checkup, switch-forced, game-over
      players: {
        1: createPlayer(p1Team, modeConfig.prizes),
        2: createPlayer(p2Team, modeConfig.prizes)
      },
      gxUsed: { 1: false, 2: false },
      vstarUsed: { 1: false, 2: false },
      textQueue: [],
      winner: null,
      stats: { 1: { kos: 0, damageDealt: 0 }, 2: { kos: 0, damageDealt: 0 } }
    };

    return state;
  }

  function createPlayer(team, prizeCount) {
    return {
      team: team.map(card => createBattlePokemon(card)),
      activeIndex: 0,
      prizes: prizeCount,
      prizesRemaining: prizeCount
    };
  }

  function createBattlePokemon(card) {
    return {
      ...card,
      currentHp: card.hp,
      maxHp: card.hp,
      energy: [],
      totalEnergy: 0,
      conditions: {
        poisoned: false,
        burned: false,
        asleep: false,
        paralyzed: false,
        confused: false
      },
      canAttackThisTurn: true,
      justPlayed: false,
      fainted: false,
      turnsSincePlay: 0
    };
  }

  // ─── Getters ───
  function getState() { return state; }

  function getActive(player) {
    return state.players[player].team[state.players[player].activeIndex];
  }

  function getBench(player) {
    return state.players[player].team.filter((p, i) =>
      i !== state.players[player].activeIndex && !p.fainted
    );
  }

  function getAlivePokemon(player) {
    return state.players[player].team.filter(p => !p.fainted);
  }

  function getCurrentPlayer() { return state.turn; }
  function getOpponentPlayer() { return state.turn === 1 ? 2 : 1; }

  // ─── Energy System ───
  function addTurnEnergy(player) {
    const active = getActive(player);
    if (!active || active.fainted) return;

    const energyType = active.primaryType || 'Colorless';
    active.energy.push(energyType);
    active.totalEnergy++;
  }

  function hasEnoughEnergy(pokemon, attack) {
    if (!attack.cost || attack.cost.length === 0) return true;

    const available = [...pokemon.energy];
    const required = [...attack.cost];

    // First, match specific type requirements
    for (let i = required.length - 1; i >= 0; i--) {
      if (required[i] === 'Colorless') continue;

      const idx = available.indexOf(required[i]);
      if (idx !== -1) {
        available.splice(idx, 1);
        required.splice(i, 1);
      } else {
        return false; // Missing a specific type
      }
    }

    // Remaining required should be Colorless (any type works)
    const colorlessNeeded = required.filter(r => r === 'Colorless').length;
    return available.length >= colorlessNeeded;
  }

  function consumeEnergy(pokemon, attack) {
    if (!attack.cost || attack.cost.length === 0) return;

    const required = [...attack.cost];

    // Consume specific types first
    for (let i = required.length - 1; i >= 0; i--) {
      if (required[i] === 'Colorless') continue;
      const idx = pokemon.energy.indexOf(required[i]);
      if (idx !== -1) {
        pokemon.energy.splice(idx, 1);
        pokemon.totalEnergy--;
        required.splice(i, 1);
      }
    }

    // Consume any energy for Colorless
    const colorlessNeeded = required.filter(r => r === 'Colorless').length;
    for (let i = 0; i < colorlessNeeded && pokemon.energy.length > 0; i++) {
      pokemon.energy.pop();
      pokemon.totalEnergy--;
    }
  }

  // ─── Damage Calculation ───
  function calculateDamage(attacker, defender, attack) {
    let damage = attack.damage;
    if (damage <= 0) return { damage: 0, effective: 'normal', details: [] };

    const details = [];
    let effective = 'normal';

    // Apply weakness
    if (defender.weaknesses && defender.weaknesses.length > 0) {
      for (const weakness of defender.weaknesses) {
        if (weakness.type === attacker.primaryType) {
          damage *= 2;
          effective = 'super';
          details.push(`Weakness ×2!`);
          break;
        }
      }
    }

    // Apply resistance
    if (defender.resistances && defender.resistances.length > 0) {
      for (const resistance of defender.resistances) {
        if (resistance.type === attacker.primaryType) {
          const resistValue = parseInt(resistance.value) || -30;
          damage += resistValue; // value is negative like "-30"
          if (effective !== 'super') effective = 'resist';
          details.push(`Resistance ${resistance.value}`);
          break;
        }
      }
    }

    // Minimum 0 damage
    damage = Math.max(0, damage);

    return { damage, effective, details };
  }

  // ─── Attack Execution ───
  function executeAttack(moveIndex) {
    const attacker = getActive(state.turn);
    const defender = getActive(getOpponentPlayer());
    const attack = attacker.attacks[moveIndex];

    if (!attack) return null;
    if (attacker.fainted) return null;

    // Check confusion
    if (attacker.conditions.confused) {
      const confuseFlip = flipCoin();
      if (!confuseFlip) {
        // Self damage
        attacker.currentHp = Math.max(0, attacker.currentHp - 30);
        return {
          type: 'confused-self-hit',
          attacker: attacker.name,
          damage: 30,
          coinResult: 'tails',
          messages: [
            `${attacker.name} is confused!`,
            `It hurt itself in confusion! (30 damage)`
          ]
        };
      }
    }

    // Check paralysis
    if (attacker.conditions.paralyzed) {
      return {
        type: 'paralyzed',
        messages: [`${attacker.name} is paralyzed! It can't move!`]
      };
    }

    // Check sleep
    if (attacker.conditions.asleep) {
      return {
        type: 'asleep',
        messages: [`${attacker.name} is fast asleep!`]
      };
    }

    // Check energy
    if (!hasEnoughEnergy(attacker, attack)) {
      return {
        type: 'no-energy',
        messages: [`${attacker.name} doesn't have enough energy for ${attack.name}!`]
      };
    }

    // Check GX / VSTAR once-per-game
    if (attack.isGX && state.gxUsed[state.turn]) {
      return { type: 'gx-used', messages: ['GX attack already used this game!'] };
    }
    if (attack.isVSTAR && state.vstarUsed[state.turn]) {
      return { type: 'vstar-used', messages: ['VSTAR Power already used this game!'] };
    }

    // Consume energy
    consumeEnergy(attacker, attack);

    // Mark GX/VSTAR as used
    if (attack.isGX) state.gxUsed[state.turn] = true;
    if (attack.isVSTAR) state.vstarUsed[state.turn] = true;

    // Calculate damage
    const result = calculateDamage(attacker, defender, attack);

    // Apply damage
    defender.currentHp = Math.max(0, defender.currentHp - result.damage);

    // Track stats
    state.stats[state.turn].damageDealt += result.damage;

    // Parse attack text for special effects
    const effects = parseAttackEffects(attack.text, attacker, defender);

    // Build messages
    const messages = [`${attacker.name} used ${attack.name}!`];

    if (result.damage > 0) {
      if (result.effective === 'super') messages.push("It's super effective!");
      if (result.effective === 'resist') messages.push("It's not very effective...");
    }

    // Check KO
    let ko = false;
    if (defender.currentHp <= 0) {
      defender.fainted = true;
      ko = true;
      messages.push(`${defender.name} fainted!`);
      state.stats[state.turn].kos++;

      // Draw prizes
      const prizesDrawn = Math.min(defender.prizeCards, state.players[state.turn].prizesRemaining);
      state.players[state.turn].prizesRemaining -= prizesDrawn;
      if (prizesDrawn > 0) {
        messages.push(`Player ${state.turn} drew ${prizesDrawn} Prize card${prizesDrawn > 1 ? 's' : ''}!`);
      }
    }

    return {
      type: 'attack',
      attacker: attacker.name,
      defender: defender.name,
      attack: attack,
      damage: result.damage,
      effective: result.effective,
      details: result.details,
      effects: effects,
      ko: ko,
      messages: messages
    };
  }

  /**
   * Parse attack text for special conditions / effects
   */
  function parseAttackEffects(text, attacker, defender) {
    if (!text) return [];
    const effects = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('poison')) {
      defender.conditions.poisoned = true;
      effects.push({ type: 'poison', target: 'defender' });
    }
    if (lowerText.includes('burn')) {
      defender.conditions.burned = true;
      effects.push({ type: 'burn', target: 'defender' });
    }
    if (lowerText.includes('asleep') || lowerText.includes('sleep')) {
      clearRotationConditions(defender);
      defender.conditions.asleep = true;
      effects.push({ type: 'asleep', target: 'defender' });
    }
    if (lowerText.includes('paralyz')) {
      clearRotationConditions(defender);
      defender.conditions.paralyzed = true;
      effects.push({ type: 'paralyzed', target: 'defender' });
    }
    if (lowerText.includes('confus')) {
      clearRotationConditions(defender);
      defender.conditions.confused = true;
      effects.push({ type: 'confused', target: 'defender' });
    }

    // Self damage (discard energy, etc.)
    if (lowerText.includes('does') && lowerText.includes('damage to itself')) {
      const selfDmgMatch = lowerText.match(/(\d+)\s*damage\s*to\s*itself/);
      if (selfDmgMatch) {
        const selfDmg = parseInt(selfDmgMatch[1]);
        attacker.currentHp = Math.max(0, attacker.currentHp - selfDmg);
        effects.push({ type: 'self-damage', amount: selfDmg });
      }
    }

    // Heal
    if (lowerText.includes('heal')) {
      const healMatch = lowerText.match(/heal\s*(\d+)/);
      if (healMatch) {
        const healAmt = parseInt(healMatch[1]);
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healAmt);
        effects.push({ type: 'heal', amount: healAmt });
      }
    }

    return effects;
  }

  /**
   * Asleep, Paralyzed, Confused are mutually exclusive (rotation conditions)
   */
  function clearRotationConditions(pokemon) {
    pokemon.conditions.asleep = false;
    pokemon.conditions.paralyzed = false;
    pokemon.conditions.confused = false;
  }

  // ─── Pokémon Checkup (Between Turns) ───
  function pokemonCheckup() {
    const results = [];

    // Check both actives
    for (const playerNum of [1, 2]) {
      const active = getActive(playerNum);
      if (!active || active.fainted) continue;

      // 1. Poison — 10 damage
      if (active.conditions.poisoned) {
        active.currentHp = Math.max(0, active.currentHp - 10);
        results.push({
          player: playerNum,
          type: 'poison',
          pokemon: active.name,
          damage: 10,
          message: `${active.name} is hurt by poison! (-10 HP)`
        });
        if (active.currentHp <= 0) {
          active.fainted = true;
          results.push({
            player: playerNum,
            type: 'faint',
            pokemon: active.name,
            message: `${active.name} fainted from poison!`
          });
        }
      }

      // 2. Burn — flip coin, tails = 20 damage
      if (active.conditions.burned && !active.fainted) {
        const burnFlip = flipCoin();
        if (!burnFlip) {
          active.currentHp = Math.max(0, active.currentHp - 20);
          results.push({
            player: playerNum,
            type: 'burn',
            pokemon: active.name,
            damage: 20,
            coinResult: 'tails',
            message: `${active.name} is hurt by its burn! Coin: Tails (-20 HP)`
          });
          if (active.currentHp <= 0) {
            active.fainted = true;
            results.push({
              player: playerNum,
              type: 'faint',
              pokemon: active.name,
              message: `${active.name} fainted from burn!`
            });
          }
        } else {
          results.push({
            player: playerNum,
            type: 'burn-safe',
            pokemon: active.name,
            coinResult: 'heads',
            message: `${active.name} burn check: Coin: Heads — safe!`
          });
        }
      }

      // 3. Asleep — flip coin, heads = wake up
      if (active.conditions.asleep && !active.fainted) {
        const sleepFlip = flipCoin();
        if (sleepFlip) {
          active.conditions.asleep = false;
          results.push({
            player: playerNum,
            type: 'wake',
            pokemon: active.name,
            coinResult: 'heads',
            message: `${active.name} woke up! Coin: Heads`
          });
        } else {
          results.push({
            player: playerNum,
            type: 'still-asleep',
            pokemon: active.name,
            coinResult: 'tails',
            message: `${active.name} is still asleep. Coin: Tails`
          });
        }
      }

      // 4. Paralyzed — clears after owner's turn
      if (active.conditions.paralyzed && !active.fainted) {
        active.conditions.paralyzed = false;
        results.push({
          player: playerNum,
          type: 'paralysis-clear',
          pokemon: active.name,
          message: `${active.name} is no longer paralyzed!`
        });
      }
    }

    return results;
  }

  // ─── Retreat / Switch ───
  function canRetreat(player) {
    const active = getActive(player);
    if (!active || active.fainted) return false;
    if (active.conditions.paralyzed || active.conditions.asleep) return false;
    if (getBench(player).length === 0) return false;

    // Check retreat cost
    const cost = active.convertedRetreatCost || 0;
    return active.totalEnergy >= cost;
  }

  function retreat(player, benchIndex) {
    const active = getActive(player);
    if (!canRetreat(player)) return false;

    // Consume retreat energy
    const cost = active.convertedRetreatCost || 0;
    for (let i = 0; i < cost && active.energy.length > 0; i++) {
      active.energy.pop();
      active.totalEnergy--;
    }

    // Clear conditions (moving to bench cures all)
    clearAllConditions(active);

    // Find actual bench index in team array
    const aliveBench = [];
    state.players[player].team.forEach((p, i) => {
      if (i !== state.players[player].activeIndex && !p.fainted) {
        aliveBench.push(i);
      }
    });

    if (benchIndex >= 0 && benchIndex < aliveBench.length) {
      state.players[player].activeIndex = aliveBench[benchIndex];
      return true;
    }
    return false;
  }

  function forcedSwitch(player, benchIndex) {
    // After a KO, switch with no energy cost, no condition clearing needed
    const aliveBench = [];
    state.players[player].team.forEach((p, i) => {
      if (i !== state.players[player].activeIndex && !p.fainted) {
        aliveBench.push(i);
      }
    });

    if (benchIndex >= 0 && benchIndex < aliveBench.length) {
      state.players[player].activeIndex = aliveBench[benchIndex];
      return true;
    }
    return false;
  }

  function clearAllConditions(pokemon) {
    pokemon.conditions.poisoned = false;
    pokemon.conditions.burned = false;
    pokemon.conditions.asleep = false;
    pokemon.conditions.paralyzed = false;
    pokemon.conditions.confused = false;
  }

  // ─── Evolution ───
  function canEvolve(player, activeCard, evolutionCard) {
    // Can't evolve on first turn or same turn played
    if (activeCard.turnsSincePlay < 1) return false;
    // Check if evolution matches
    if (evolutionCard.evolvesFrom &&
        evolutionCard.evolvesFrom.toLowerCase() === activeCard.name.toLowerCase()) {
      return true;
    }
    // V → VMAX / VSTAR check
    if ((evolutionCard.cardType === 'vmax' || evolutionCard.cardType === 'vstar') &&
        activeCard.cardType === 'v') {
      const baseName = activeCard.name.replace(/ V$/i, '');
      const evoBaseName = evolutionCard.name.replace(/ VMAX| VSTAR/i, '');
      if (baseName.toLowerCase() === evoBaseName.toLowerCase()) return true;
    }
    return false;
  }

  function evolve(player, evolutionCard) {
    const active = getActive(player);

    // Transfer current state
    const oldHp = active.currentHp;
    const hpDiff = evolutionCard.hp - active.maxHp;
    const energy = [...active.energy];

    // Replace with evolution
    const evolvedPokemon = createBattlePokemon(evolutionCard);
    evolvedPokemon.currentHp = Math.min(oldHp + Math.max(0, hpDiff), evolvedPokemon.maxHp);
    evolvedPokemon.energy = energy;
    evolvedPokemon.totalEnergy = energy.length;

    // Clear conditions
    clearAllConditions(evolvedPokemon);

    state.players[player].team[state.players[player].activeIndex] = evolvedPokemon;

    return evolvedPokemon;
  }

  // ─── Turn Management ───
  function startTurn() {
    const active = getActive(state.turn);
    if (active) {
      active.turnsSincePlay++;
    }
    addTurnEnergy(state.turn);
    state.phase = 'action';
    state.turnCount++;
  }

  function endTurn() {
    // Run Pokémon Checkup
    const checkupResults = pokemonCheckup();

    // Check for KOs from checkup
    for (const result of checkupResults) {
      if (result.type === 'faint') {
        const opponent = result.player === 1 ? 2 : 1;
        const faintedPokemon = getActive(result.player);
        if (faintedPokemon) {
          const prizesDrawn = Math.min(faintedPokemon.prizeCards, state.players[opponent].prizesRemaining);
          state.players[opponent].prizesRemaining -= prizesDrawn;
          state.stats[opponent].kos++;
        }
      }
    }

    // Switch turns
    state.turn = state.turn === 1 ? 2 : 1;

    // Check win condition before starting next turn
    const winner = checkWinCondition();
    if (winner) {
      state.winner = winner;
      state.phase = 'game-over';
      return { checkupResults, winner };
    }

    // Check if new active player needs to switch (their active fainted during checkup)
    const newActive = getActive(state.turn);
    if (newActive && newActive.fainted) {
      const alive = getAlivePokemon(state.turn);
      if (alive.length > 0) {
        state.phase = 'switch-forced';
        return { checkupResults, forcedSwitch: state.turn };
      }
    }

    return { checkupResults };
  }

  // ─── Win Condition ───
  function checkWinCondition() {
    // Check both players
    for (const playerNum of [1, 2]) {
      const opponent = playerNum === 1 ? 2 : 1;

      // Win: All opponent's Pokémon fainted
      const oppAlive = getAlivePokemon(opponent);
      if (oppAlive.length === 0) return playerNum;

      // Win: Took all prize cards (prizes remaining = 0)
      if (state.players[playerNum].prizesRemaining <= 0 && state.modeConfig.prizes > 0) {
        return playerNum;
      }
    }

    return null;
  }

  // ─── Utility ───
  function flipCoin() {
    return Math.random() < 0.5; // true = heads, false = tails
  }

  function getHpBarColor(current, max) {
    const pct = current / max;
    if (pct > 0.5) return 'green';
    if (pct > 0.25) return 'yellow';
    return 'red';
  }

  function getConditionsList(pokemon) {
    const conditions = [];
    if (pokemon.conditions.poisoned) conditions.push({ code: 'PSN', cls: 'psn' });
    if (pokemon.conditions.burned) conditions.push({ code: 'BRN', cls: 'brn' });
    if (pokemon.conditions.asleep) conditions.push({ code: 'SLP', cls: 'slp' });
    if (pokemon.conditions.paralyzed) conditions.push({ code: 'PAR', cls: 'par' });
    if (pokemon.conditions.confused) conditions.push({ code: 'CNF', cls: 'cnf' });
    return conditions;
  }

  return {
    MODES,
    initBattle,
    getState,
    getActive,
    getBench,
    getAlivePokemon,
    getCurrentPlayer,
    getOpponentPlayer,
    hasEnoughEnergy,
    calculateDamage,
    executeAttack,
    pokemonCheckup,
    canRetreat,
    retreat,
    forcedSwitch,
    canEvolve,
    evolve,
    startTurn,
    endTurn,
    checkWinCondition,
    flipCoin,
    getHpBarColor,
    getConditionsList,
    addTurnEnergy
  };
})();
