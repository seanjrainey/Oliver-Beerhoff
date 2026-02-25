# 2-Player Football Card Game

A head-to-head card game that simulates a football (soccer) match.

## Web App (Shareable)
Files:
- `index.html`
- `styles.css`
- `app.js`

Run locally:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

Share with friends:
1. Push these files to a GitHub repo.
2. Enable GitHub Pages (Settings -> Pages -> Deploy from branch).
3. Share the generated Pages URL.

Alternative: drag-and-drop the folder to Netlify Drop for instant hosting.

## Deck
- Standard 52-card deck.
- Ranks `2` through `A` (Ace high).
- Suits displayed as symbols: `♦︎ ♣︎ ♥︎ ♠︎`.

## Objective
Win more positional battles than your opponent. Each battle won is worth **1 point**.

## Setup
1. Choose roles:
- One player is the **Home Team** (**Non-Dealer**).
- One player is the **Away Team** (**Dealer**).

2. The **Home Team** chooses the formation (example: `3-5-2`).

3. Build each team to match that formation:
- 1 Goalkeeper
- Defenders based on formation (first number)
- Midfielders based on formation (second number)
- Forwards based on formation (third number)

4. Dealing:
- Away Team (Dealer) deals the opposition team first.
- Then deals the other team.
- All team cards are dealt face down.
- Each player also receives **3 substitute cards**, face down.

## Match Order
Resolve positions one at a time in this sequence:
1. Goalkeeper
2. All Defence positions (one by one)
3. All Midfield positions (one by one)
4. All Forward positions (one by one)

## Reveal Order (Attacker/Defender)
- The player who reveals first in a battle is the **attacker** for that battle.
- **Battles 1 and 2:** Home Team (Non-Dealer) reveals first (home-ground advantage).
- **From battle 3 onward:** players alternate who reveals first each battle.

## Battle Resolution
For each position battle:
1. Attacker reveals their card.
2. Attacker may make substitutions (see below), after revealing and before the defender reveals.
3. Defender reveals their card.
4. Higher card value wins the battle and scores **1 point**.
5. If values are equal, the battle is a draw and no point is scored.

## Substitutions
- Only the **attacker** may substitute in that battle.
- Maximum **1 substitute per battle**.
- Substitution window is after the attacker reveals and before the defender reveals.
- On the **final battle of the match**, the attacker may use multiple remaining substitutes (up to all they have left) before the defender reveals.
- Each player has only **3 substitutes total** for the full match.
- Substitute cards stay **face down** and are applied as a **random draw** from that player's remaining substitutes.

## End of Match
After all position battles are resolved:
- Player with more points wins.
- If tied on points, go to a penalty shootout.

## Penalty Shootout
- Deal 5 cards to each player.
- Reveal cards one-by-one.
- Card outcomes:
- `2-5` = miss
- `6-7` = woodwork
- `8+` = goal
- Count goals across 5 cards each; higher total wins the match.
- If still tied after 5 each, use sudden-death penalty cards until one player scores and the other does not in the same round.

## Playable CLI Version
Run:

```bash
python3 football_card_game.py
```

The game will prompt for:
- Home Team name
- Away Team name
- Formation (select from dropdown presets)
- Substitution choices during each battle
