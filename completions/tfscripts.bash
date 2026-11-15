# bash completion for tfscripts CLIs that implement:
#   <cmd> __complete -- <words...>
#
# Usage (from the tfscripts repo after build, with bin/ on PATH):
#   source /path/to/tfscripts/completions/tfscripts.bash
#
# Register another command that supports __complete by adding:
#   complete -F _tfscripts_complete <cmd>

_tfscripts_complete() {
  local cmd="${COMP_WORDS[0]}"
  local -a words=()
  local i out line

  for ((i = 1; i < COMP_CWORD; i++)); do
    words+=("${COMP_WORDS[i]}")
  done
  # Current word may be unset when completing after a trailing space.
  words+=("${COMP_WORDS[COMP_CWORD]-}")

  COMPREPLY=()
  out="$("${cmd}" __complete -- "${words[@]}" 2>/dev/null)" || return

  while IFS= read -r line; do
    [[ -n ${line} ]] || continue
    COMPREPLY+=("${line}")
  done <<<"${out}"
}

complete -F _tfscripts_complete repos
