#!/usr/bin/env python3
"""Playable 2-player football card game (CLI)."""

from __future__ import annotations

import random
import re
from dataclasses import dataclass, field


RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]
SUITS = ["H", "D", "C", "S"]
SUIT_SYMBOL = {"H": "♥︎", "D": "♦︎", "C": "♣︎", "S": "♠︎"}
RANK_VALUE = {rank: index + 2 for index, rank in enumerate(RANKS)}


@dataclass(frozen=True)
class Card:
    rank: str
    suit: str

    @property
    def value(self) -> int:
        return RANK_VALUE[self.rank]

    def __str__(self) -> str:
        return f"{self.rank}{SUIT_SYMBOL[self.suit]}"


@dataclass
class Player:
    name: str
    role: str
    lineup: list[Card] = field(default_factory=list)
    substitutes: list[Card] = field(default_factory=list)
    points: int = 0


def prompt_non_empty(prompt: str) -> str:
    while True:
        value = input(prompt).strip()
        if value:
            return value
        print("Please enter a value.")


def prompt_yes_no(prompt: str) -> bool:
    while True:
        value = input(prompt).strip().lower()
        if value in {"y", "yes"}:
            return True
        if value in {"n", "no"}:
            return False
        print("Please enter y/n.")


def prompt_int(prompt: str, minimum: int, maximum: int) -> int:
    while True:
        value = input(prompt).strip()
        try:
            number = int(value)
        except ValueError:
            print("Please enter a number.")
            continue
        if minimum <= number <= maximum:
            return number
        print(f"Please enter a number from {minimum} to {maximum}.")


def parse_formation(raw: str) -> tuple[int, int, int]:
    cleaned = raw.strip().replace("–", "-").replace("—", "-")
    match = re.fullmatch(r"(\d+)-(\d+)-(\d+)", cleaned)
    if not match:
        raise ValueError("Formation must look like 3-5-2.")

    defenders, midfielders, forwards = map(int, match.groups())
    if defenders <= 0 or midfielders <= 0 or forwards <= 0:
        raise ValueError("Each line in the formation must be greater than 0.")
    if defenders + midfielders + forwards != 10:
        raise ValueError(
            "Formation must total 10 outfield players (example: 4-4-2, 3-5-2)."
        )
    return defenders, midfielders, forwards


def build_positions(formation: tuple[int, int, int]) -> list[str]:
    defenders, midfielders, forwards = formation
    positions = ["GK"]
    positions.extend([f"DEF {index + 1}" for index in range(defenders)])
    positions.extend([f"MID {index + 1}" for index in range(midfielders)])
    positions.extend([f"FWD {index + 1}" for index in range(forwards)])
    return positions


def build_shuffled_deck() -> list[Card]:
    deck = [Card(rank, suit) for suit in SUITS for rank in RANKS]
    random.shuffle(deck)
    return deck


def deal_players(deck: list[Card], dealer: Player, non_dealer: Player, positions: list[str]) -> None:
    lineup_size = len(positions)

    # Opposition dealt first: non-dealer's opposition is the dealer.
    dealer.lineup = [deck.pop() for _ in range(lineup_size)]
    non_dealer.lineup = [deck.pop() for _ in range(lineup_size)]
    dealer.substitutes = [deck.pop() for _ in range(3)]
    non_dealer.substitutes = [deck.pop() for _ in range(3)]


def attacker_for_battle(index: int, non_dealer: Player, dealer: Player) -> Player:
    if index <= 2:
        return non_dealer
    return dealer if index % 2 == 1 else non_dealer


def defender_for_battle(attacker: Player, dealer: Player, non_dealer: Player) -> Player:
    return dealer if attacker is non_dealer else non_dealer


def maybe_use_substitutions(player: Player, battle_index: int, total_battles: int) -> None:
    remaining = len(player.substitutes)
    if remaining == 0:
        return

    final_battle = battle_index == total_battles
    max_allowed = remaining if final_battle else 1
    print(
        f"{player.name} may use up to {max_allowed} substitute(s) now, before the defender reveals."
    )

    if final_battle and max_allowed > 1:
        use_any = prompt_yes_no("Use substitutes on final battle? (y/n): ")
        if not use_any:
            return
        to_use = prompt_int(f"How many substitutes to use (1-{max_allowed})? ", 1, max_allowed)
    else:
        use_any = prompt_yes_no("Use a substitute? (y/n): ")
        if not use_any:
            return
        to_use = 1

    for _ in range(to_use):
        chosen_idx = random.randrange(len(player.substitutes))
        chosen = player.substitutes.pop(chosen_idx)
        player.lineup[battle_index - 1] = chosen
        print("A random face-down substitute is now set for this battle.")


def resolve_battle(
    battle_index: int,
    position: str,
    attacker: Player,
    defender: Player,
    total_battles: int,
) -> None:
    attacker_card = attacker.lineup[battle_index - 1]
    print(f"{attacker.name} reveals {attacker_card} (value {attacker_card.value}).")

    maybe_use_substitutions(attacker, battle_index, total_battles)
    attacker_card = attacker.lineup[battle_index - 1]
    print(f"{attacker.name}'s final card for {position}: {attacker_card} (value {attacker_card.value}).")

    defender_card = defender.lineup[battle_index - 1]
    print(f"{defender.name} reveals {defender_card} (value {defender_card.value}).")

    if attacker_card.value > defender_card.value:
        attacker.points += 1
        print(f"{attacker.name} wins {position} and scores 1 point.")
    elif defender_card.value > attacker_card.value:
        defender.points += 1
        print(f"{defender.name} wins {position} and scores 1 point.")
    else:
        print("Draw for this position. No points awarded.")


def print_score(non_dealer: Player, dealer: Player) -> None:
    print(f"Score -> {non_dealer.name}: {non_dealer.points} | {dealer.name}: {dealer.points}")


def penalty_result(card: Card) -> str:
    if card.value <= 5:
        return "MISS"
    if card.value <= 7:
        return "WOODWORK"
    return "GOAL"


def run_penalty_shootout(deck: list[Card], non_dealer: Player, dealer: Player) -> Player | None:
    needed_cards = 10
    if len(deck) < needed_cards:
        raise RuntimeError("Not enough cards left in deck for penalty shootout.")

    non_dealer_penalties = [deck.pop() for _ in range(5)]
    dealer_penalties = [deck.pop() for _ in range(5)]
    non_dealer_goals = 0
    dealer_goals = 0

    print("\n=== Penalty Shootout ===")
    print("Each player gets 5 penalty cards.")
    print("2-5 = MISS, 6-7 = WOODWORK, 8+ = GOAL.")

    for kick in range(1, 6):
        print(f"\nPenalty {kick}:")

        nd_card = non_dealer_penalties[kick - 1]
        nd_result = penalty_result(nd_card)
        print(f"{non_dealer.name} reveals {nd_card}: {nd_result}")
        if nd_result == "GOAL":
            non_dealer_goals += 1

        d_card = dealer_penalties[kick - 1]
        d_result = penalty_result(d_card)
        print(f"{dealer.name} reveals {d_card}: {d_result}")
        if d_result == "GOAL":
            dealer_goals += 1

        print(f"Penalties -> {non_dealer.name}: {non_dealer_goals} | {dealer.name}: {dealer_goals}")

    if non_dealer_goals > dealer_goals:
        print(f"\n{non_dealer.name} wins on penalties ({non_dealer_goals}-{dealer_goals}).")
        return non_dealer
    if dealer_goals > non_dealer_goals:
        print(f"\n{dealer.name} wins on penalties ({dealer_goals}-{non_dealer_goals}).")
        return dealer

    print(f"\nPenalties tied after 5 ({non_dealer_goals}-{dealer_goals}). Sudden death begins.")
    sudden_round = 1
    while len(deck) >= 2:
        print(f"\nSudden Death {sudden_round}:")
        nd_card = deck.pop()
        d_card = deck.pop()

        nd_result = penalty_result(nd_card)
        d_result = penalty_result(d_card)

        print(f"{non_dealer.name} reveals {nd_card}: {nd_result}")
        print(f"{dealer.name} reveals {d_card}: {d_result}")

        nd_goal = nd_result == "GOAL"
        d_goal = d_result == "GOAL"
        if nd_goal and not d_goal:
            print(f"\n{non_dealer.name} wins on sudden death penalties.")
            return non_dealer
        if d_goal and not nd_goal:
            print(f"\n{dealer.name} wins on sudden death penalties.")
            return dealer

        print("No winner in this sudden-death round.")
        sudden_round += 1

    print("\nNo cards left for further penalties. Match remains drawn.")
    return None


def main() -> None:
    print("=== 2-Player Football Card Game ===")
    non_dealer_name = prompt_non_empty("Home Team name: ")
    dealer_name = prompt_non_empty("Away Team name: ")
    non_dealer = Player(name=non_dealer_name, role="Home Team (Non-Dealer)")
    dealer = Player(name=dealer_name, role="Away Team (Dealer)")

    while True:
        try:
            formation = parse_formation(
                input(f"{non_dealer.name} (Home Team), choose formation (e.g. 3-5-2): ")
            )
            break
        except ValueError as err:
            print(err)

    positions = build_positions(formation)
    deck = build_shuffled_deck()

    needed_cards = (len(positions) * 2) + 6
    if needed_cards > len(deck):
        raise RuntimeError("Not enough cards in deck for this match setup.")

    deal_players(deck, dealer, non_dealer, positions)

    print("\nCards dealt face down.")
    print(f"{non_dealer.name} is Home Team (non-dealer) and reveals first in battles 1 and 2.")
    print(f"Each player has {len(positions)} lineup cards and 3 substitutes.\n")

    total_battles = len(positions)
    for battle_index, position in enumerate(positions, start=1):
        print(f"\n--- Battle {battle_index}/{total_battles}: {position} ---")
        attacker = attacker_for_battle(battle_index, non_dealer, dealer)
        defender = defender_for_battle(attacker, dealer, non_dealer)
        print(f"Attacker (reveals first): {attacker.name}")

        resolve_battle(battle_index, position, attacker, defender, total_battles)
        print_score(non_dealer, dealer)

    print("\n=== Full Time ===")
    print_score(non_dealer, dealer)
    if non_dealer.points > dealer.points:
        print(f"{non_dealer.name} wins the match.")
    elif dealer.points > non_dealer.points:
        print(f"{dealer.name} wins the match.")
    else:
        print("Match tied. Going to penalty shootout.")
        run_penalty_shootout(deck, non_dealer, dealer)


if __name__ == "__main__":
    main()
