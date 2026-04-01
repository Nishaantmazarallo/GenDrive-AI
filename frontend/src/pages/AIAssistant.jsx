import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import './AIAssistant.css'

export default function AIAssistant() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m ChargeGenie AI Assistant. Ask me anything about:\n• Best charging stations on your route\n• Cost comparisons between chargers\n• Estimated charging times\n• Tips to save money on charging\n\nHow can I help you today?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tripData, setTripData] = useState(null)
  const [chargers, setChargers] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    // Load trip data if available
    const savedTrip = localStorage.getItem('genDriveTrip')
    if (savedTrip) {
      try {
        const data = JSON.parse(savedTrip)
        setTripData(data)
        if (data.chargers) {
          setChargers(data.chargers)
        }
      } catch (e) {
        console.log('No saved trip data')
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      // Check if we have chargers to analyze
      if (chargers.length > 0) {
        // Use AI explain endpoint for intelligent responses
        const response = await axios.post('/api/ai-explain', {
          selected_charger: chargers[0],
          alternatives: chargers.slice(1, 5)
        })

        // Generate contextual response based on user query
        let aiResponse = generateContextualResponse(userMessage, response.data, chargers)
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }])
      } else {
        // Generic responses when no trip data
        const response = generateGenericResponse(userMessage)
        setMessages(prev => [...prev, { role: 'assistant', content: response }])
      }
    } catch (error) {
      console.error('AI Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I\'m having trouble processing your request. Try planning a trip first to get personalized recommendations!'
      }])
    }

    setLoading(false)
  }

  const generateContextualResponse = (question, explanation, chargerList) => {
    const q = question.toLowerCase()

    // Best charger question
    if (q.includes('best') || q.includes('recommend') || q.includes('should')) {
      if (explanation.recommendation) {
        return `Based on my analysis, **${explanation.recommendation.best_charger}** is recommended!\n\n${explanation.summary}\n\n💡 It offers the best balance of price, reliability, and convenience for your trip.`
      }
      return `I recommend the first charging station on your route - ${chargerList[0]?.name || 'Unknown'}. It's the optimal choice based on price and location!`
    }

    // Cost question
    if (q.includes('cost') || q.includes('price') || q.includes('cheap') || q.includes('expensive')) {
      const cheapest = chargerList.sort((a, b) => (a.price_per_kwh || 999) - (b.price_per_kwh || 999))[0]
      if (cheapest) {
        return `💰 The cheapest option is **${cheapest.name}** at ₹${cheapest.price_per_kwh}/kWh.\n\n${explanation.explanations.find(e => e.includes('💰')) || ''}\n\nThis could save you money compared to other stations!`
      }
    }

    // Time/fast charging question
    if (q.includes('fast') || q.includes('time') || q.includes('quick')) {
      const fastCharger = chargerList.find(c => c.fast)
      if (fastCharger) {
        return `⚡ **${fastCharger.name}** is a fast charger!\n\nFast charging can charge your EV in 30-45 minutes vs 2-4 hours for standard chargers. However, fast chargers may cost more per kWh.\n\nWould you like me to compare the total costs?`
      }
    }

    // Reliability question
    if (q.includes('reliable') || q.includes('working') || q.includes('available')) {
      const reliable = chargerList.sort((a, b) => b.reliability - a.reliability)[0]
      if (reliable) {
        const rel = Math.round((reliable.reliability || 0.85) * 100)
        return `⭐ The most reliable option is **${reliable.name}** with ${rel}% reliability.\n\nThis station has a good track record of being operational when users visit.`
      }
    }

    // Distance/detour question
    if (q.includes('distance') || q.includes('detour') || q.includes('close')) {
      const closest = chargerList.sort((a, b) => a.distance_to_route_km - b.distance_to_route_km)[0]
      if (closest) {
        return `📍 **${closest.name}** is ${closest.distance_to_route_km?.toFixed(1)}km from your route.\n\n${explanation.explanations.find(e => e.includes('📍')) || ''}\n\nA shorter detour means less wasted time and range!`
      }
    }

    // Default to explanation summary
    return explanation.summary + '\n\n' + explanation.explanations.slice(0, 3).join('\n')
  }

  const generateGenericResponse = (question) => {
    const q = question.toLowerCase()

    if (q.includes('cost') || q.includes('price')) {
      return `To get accurate cost estimates, please:\n1. Plan a trip in the Trip Planner\n2. Find chargers on your route\n3. Ask me again about costs\n\nI can then show you the total cost including charging, detour distance, and time!`
    }

    if (q.includes('fast') || q.includes('time')) {
      return `⚡ Fast chargers (50kW+) can charge to 80% in 30-45 minutes.\n\nStandard chargers (7-22kW) take 2-4 hours.\n\nTo get personalized estimates, plan a trip and I'll analyze the chargers on your route!`
    }

    if (q.includes('reliable') || q.includes('reliability')) {
      return `📊 I track charger reliability based on user reports!\n\nHigh reliability = 90%+\nGood = 80%+\nFair = 70%+\n\nYou can report your charging experience to help improve accuracy.`
    }

    if (q.includes('save') || q.includes('tip') || q.includes('advice')) {
      return `💡 Here are some tips to save on EV charging:\n\n1. **Charge at home** overnight (cheapest)\n2. **Plan ahead** - avoid peak hours\n3. **Use apps** to compare prices\n4. **Consider membership** plans for discounts\n5. **Combine trips** to minimize charging stops`
    }

    return `I'm your EV charging assistant! To give you personalized recommendations:\n\n1. Go to **Trip Planner** and enter your route\n2. Click **Find Chargers on Route**\n3. Come back and ask me about the best options!\n\nWhat would you like to know?`
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="ai-assistant">
      <div className="assistant-header">
        <h2>🤖 ChargeGenie AI Assistant</h2>
        <p>Ask me about charging stations, costs, and recommendations</p>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              <div className="avatar">
                {msg.role === 'assistant' ? '🤖' : '👤'}
              </div>
              <div className="content">
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="avatar">🤖</div>
              <div className="content">
                <p>Thinking...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about chargers, costs, recommendations..."
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? '...' : 'Send'}
          </button>
        </div>

        <div className="quick-actions">
          <span>Quick questions:</span>
          <button onClick={() => setInput("What's the best charger?")}>Best charger?</button>
          <button onClick={() => setInput("What's the cheapest option?")}>Cheapest?</button>
          <button onClick={() => setInput("Which is fastest?")}>Fastest?</button>
          <button onClick={() => setInput("How to save money?")}>Save money?</button>
        </div>
      </div>

      {tripData && (
        <div className="trip-summary">
          <h4>📊 Current Trip Data</h4>
          <p>Distance: {tripData.distance}km | Chargers found: {chargers.length}</p>
        </div>
      )}
    </div>
  )
}

