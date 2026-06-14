"""
CLI entry point — interactive multi-agent CRM assistant.
Run: python -m agents.main
"""
from langchain_core.messages import HumanMessage

from supervisor import AGENTS, invoke_supervisor


if __name__ == "__main__":
    print("=" * 60)
    print("  XENO AI-Native Mini CRM — Multi-Agent Console")
    print("  Agents:", ", ".join(AGENTS.keys()))
    print("  Type 'exit' or 'quit' to leave")
    print("=" * 60)

    thread_id = "xeno_cli_session"
    while True:
        user_input = input("\nMarketer: ").strip()
        if user_input.lower() in ["exit", "quit"]:
            break
        if not user_input:
            continue
        try:
            result = invoke_supervisor(user_input, thread_id)
            print(f"\n[{result['agent'].upper()} Agent]: {result['response']}")
        except Exception as e:
            print(f"\nError: {e}")
        print("-" * 60)
