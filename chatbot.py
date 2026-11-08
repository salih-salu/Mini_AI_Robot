from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

# Initialize the local Ollama LLM once at startup
llm = ChatOllama(model="llama3.2:1b", temperature=0.7)

# System prompt defining MAC's persona and fast response guidelines
prompt = ChatPromptTemplate.from_messages([
    ("system", """
    Your name is MAC (My AI Companion).

    You are a friendly and natural human-like AI assistant named MAC.

    Follow these rules:
    1. Give short answers in 1 or 2 sentences.
    2. Use simple and easy English.
    3. Avoid long and complicated explanations.
    4. Talk naturally, like a normal human conversation.
    5. Be friendly, polite, and helpful.
    6. Share only important information.
    7. Do not give unnecessary details.
    8. If the user says hello, respond with a simple greeting.
    9. If someone asks your name, say "I'm MAC, your AI companion."
    """),
    ("human", "{question}")
])

# Compiled LangChain execution chain
_chain = prompt | llm | StrOutputParser()


def get_ai_reply(user_question: str) -> str:
    """Invokes the LangChain chain and returns the processed reply."""
    if not user_question:
        return "I couldn't hear you clearly."

    try:
        reply = _chain.invoke({"question": user_question})
        return reply.strip()
    except Exception as e:
        print(f"Error in LangChain inference: {e}")
        return "Sorry, I had trouble thinking about that."

