import { Chapter1 } from './chapters/Chapter1'
import { Chapter2 } from './chapters/Chapter2'
import { Chapter3 } from './chapters/chapter3/Chapter3'

function App() {
  const path = window.location.pathname

  if (path === '/chapter-03') {
    return <Chapter3 />
  }

  if (path === '/chapter-02') {
    return <Chapter2 />
  }

  return <Chapter1 />
}

export default App
