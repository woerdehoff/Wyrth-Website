import { useContent } from '../context/ContentContext'
import AudiencePage from '../components/AudiencePage'

export default function Barbers() {
  const { barbersPage } = useContent()
  return <AudiencePage {...barbersPage} />
}