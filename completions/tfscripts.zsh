#compdef repos
# zsh completion for tfscripts CLIs that implement:
#   <cmd> __complete -- <words...>
#
# Usage (from the tfscripts repo after build, with bin/ on PATH):
#   source /path/to/tfscripts/completions/tfscripts.zsh
# `compdef` needs compsys; this file runs `compinit` when it is not loaded yet.
#
# Register another command that supports __complete by adding:
#   compdef _tfscripts_complete <cmd>

_tfscripts_complete() {
  local cmd="${words[1]}"
  local -a cli_words candidates
  local out line

  # Do not `local words` — it shadows the completion system's words array.
  cli_words=("${(@)words[2,CURRENT]}")
  if ((CURRENT > $#words)); then
    cli_words+=("")
  fi
  if ((${#cli_words[@]} == 0)); then
    cli_words=("")
  fi

  out="$("${cmd}" __complete -- "${cli_words[@]}" 2>/dev/null)" || return 0

  candidates=()
  while IFS= read -r line; do
    [[ -n ${line} ]] || continue
    candidates+=("${line}")
  done <<<"${out}"

  # Return 0 with no matches so zsh does not fall through to path completion.
  ((${#candidates[@]})) || return 0
  compadd -a candidates
}

if ! typeset -f compdef >/dev/null 2>&1; then
  autoload -Uz compinit
  compinit
fi
compdef _tfscripts_complete repos
