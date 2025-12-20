import { Chapter1 } from './chapters/Chapter1'
import { Chapter2 } from './chapters/Chapter2'

function App() {
  const path = window.location.pathname

  if (path === '/chapter-02') {
    return <Chapter2 />
  }

  return <Chapter1 />
}

export default App
