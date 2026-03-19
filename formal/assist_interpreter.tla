---- MODULE assist_interpreter ----
EXTENDS Integers, FiniteSets, Sequences, TLC

CONSTANTS Ops, MaxSections, MaxGroupsPerSection

ActionNames == {
  "init",
  "clear_operations",
  "set_top_field",
  "set_operation_fields",
  "replace_sections"
}

BoundedSeq(S, maxLen) == UNION { [1..n -> S] : n \in 0..maxLen }
GroupValues == SUBSET Ops
SectionValues == BoundedSeq(GroupValues, MaxGroupsPerSection)
AllSections == BoundedSeq(SectionValues, MaxSections)

MaxNat(S) == IF S = {} THEN 0 ELSE CHOOSE m \in S : \A n \in S : m >= n
MaxGroups(sections) ==
  IF Len(sections) = 0
    THEN 0
    ELSE MaxNat({ Len(sections[i]) : i \in 1..Len(sections) })

VARIABLES
  clearOperations,
  flatOps,
  sections,
  sectionsCount,
  groupsPerSection,
  characterSet,
  skipKeyContainsCheck,
  lastAction,
  prevSections,
  prevSectionsCount,
  prevGroupsPerSection

vars ==
  << clearOperations, flatOps, sections, sectionsCount, groupsPerSection,
     characterSet, skipKeyContainsCheck, lastAction,
     prevSections, prevSectionsCount, prevGroupsPerSection >>

RememberStructure ==
  /\ prevSections' = sections
  /\ prevSectionsCount' = sectionsCount
  /\ prevGroupsPerSection' = groupsPerSection

Init ==
  /\ clearOperations = FALSE
  /\ flatOps = {}
  /\ sections = << >>
  /\ sectionsCount = 0
  /\ groupsPerSection = 0
  /\ characterSet = "unset"
  /\ skipKeyContainsCheck = FALSE
  /\ lastAction = "init"
  /\ prevSections = << >>
  /\ prevSectionsCount = 0
  /\ prevGroupsPerSection = 0

ClearOperations ==
  /\ RememberStructure
  /\ clearOperations' = TRUE
  /\ flatOps' = {}
  /\ UNCHANGED << sections, sectionsCount, groupsPerSection,
                  characterSet, skipKeyContainsCheck >>
  /\ lastAction' = "clear_operations"

SetCharacterSet ==
  /\ \E cs \in {"unset", "alphanumeric", "binary"} :
      /\ RememberStructure
      /\ characterSet' = cs
      /\ UNCHANGED << clearOperations, flatOps, sections, sectionsCount,
                      groupsPerSection, skipKeyContainsCheck >>
      /\ lastAction' = "set_top_field"

SetSkipKeyContainsCheck ==
  /\ \E flag \in BOOLEAN :
      /\ RememberStructure
      /\ skipKeyContainsCheck' = flag
      /\ UNCHANGED << clearOperations, flatOps, sections, sectionsCount,
                      groupsPerSection, characterSet >>
      /\ lastAction' = "set_top_field"

SetOperationFields ==
  /\ \E op \in Ops :
      /\ RememberStructure
      /\ flatOps' = flatOps \cup {op}
      /\ UNCHANGED << clearOperations, sections, sectionsCount,
                      groupsPerSection, characterSet, skipKeyContainsCheck >>
      /\ lastAction' = "set_operation_fields"

ReplaceSections ==
  /\ \E newSections \in AllSections :
      /\ RememberStructure
      /\ sections' = newSections
      /\ sectionsCount' = Len(newSections)
      /\ groupsPerSection' = MaxGroups(newSections)
      /\ UNCHANGED << clearOperations, flatOps, characterSet,
                      skipKeyContainsCheck >>
      /\ lastAction' = "replace_sections"

Next ==
  \/ ClearOperations
  \/ SetCharacterSet
  \/ SetSkipKeyContainsCheck
  \/ SetOperationFields
  \/ ReplaceSections

TypeInvariant ==
  /\ clearOperations \in BOOLEAN
  /\ flatOps \subseteq Ops
  /\ sections \in AllSections
  /\ sectionsCount \in Nat
  /\ groupsPerSection \in Nat
  /\ characterSet \in {"unset", "alphanumeric", "binary"}
  /\ skipKeyContainsCheck \in BOOLEAN
  /\ lastAction \in ActionNames
  /\ prevSections \in AllSections
  /\ prevSectionsCount \in Nat
  /\ prevGroupsPerSection \in Nat

DerivedStructureMetadataInvariant ==
  /\ sectionsCount = Len(sections)
  /\ groupsPerSection = MaxGroups(sections)

StructureChangeRequiresReplace ==
  \/ lastAction = "replace_sections"
  \/ /\ sections = prevSections
     /\ sectionsCount = prevSectionsCount
     /\ groupsPerSection = prevGroupsPerSection

ClearOperationsClearsFlatOps ==
  \/ lastAction # "clear_operations"
  \/ flatOps = {}

Spec == Init /\ [][Next]_vars

====
