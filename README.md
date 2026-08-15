# dsh-dev-server

Long-running development-server lifecycle primitives for DSH.

v0.1 separates registry/state from the host-supplied process supervisor. It blocks compound shell syntax and does not spawn processes by itself; DSH/KerniQ/AgentFuse can remain the execution authority.
