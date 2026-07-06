import { useContent } from '../context/ContentContext'
import ProductAudiencePage from '../components/ProductAudiencePage'

export default function Stylists() {
  const { stylistsPage } = useContent()
  return <ProductAudiencePage {...stylistsPage} />
}