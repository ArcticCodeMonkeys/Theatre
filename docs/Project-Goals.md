# Main Goals

- Create a VTT for Ruin
- Make a gridded map in which images can be imported layered as a map, token, etc.
- Create character sheet UI which cann be edited and filled using a Rules Compendium with a list of features.
- Create an attack and save template which allows users to create attacks with certain ranges, damage, damage types, targeting rules, and conditions, and then enforce these rules and effects. Also trigger reaction queries from the targets.
- Add measuring tools and dice rollers
- Resource tracking and automatic rest recharging
- Add multiplayer with live updates so it can be played online like Roll20 (hosted locally at first, then through some web service)

# Stretch Goals

- Integrate dynamic lighting, Rules Compendium, Tutorial, Multiple Maps and presets. 


# Design Goals

- Make things modular and configurable. Its important to let the project be scaleable and create systems and objects which can be vastly reused and referenced (ie all Creatures should use the same base object to ensure that things are consistent for them)
- Make things clear and streamlined. Its important that the UI isnt cluttered and things appear onlyy when they need to.
- Automate... to a point. Dice rolls and damage as well as conditions can be automated, but things like which actions to take or reactions to take should not be. Things like resources used should be.