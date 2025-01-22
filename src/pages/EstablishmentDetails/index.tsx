import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { getSellerById, type Seller } from '../../services/sellerServices';
import { getProductsBySeller, type Product } from '../../services/productServices';
import './styles.css';

const API_BASE_IMAGE_URL = 'http://localhost:8080';

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Contact {
  phone: string;
  email: string;
}

interface FinancialSummary {
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  lastSales: {
    date: string;
    value: number;
    items: number;
  }[];
  topProducts: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

const EstablishmentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [establishment, setEstablishment] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  
  const PRODUCTS_PER_PAGE = 4;

  useEffect(() => {
    if (id) {
      loadEstablishmentDetails();
    }
  }, [id]);

  const loadEstablishmentDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [sellerData, productsData] = await Promise.all([
        getSellerById(id),
        getProductsBySeller(id)
      ]);
      
      if (!sellerData) {
        throw new Error('Estabelecimento não encontrado');
      }

      setEstablishment(sellerData);
      setProducts(productsData);
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err);
      setError('Erro ao carregar detalhes do estabelecimento');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl: string | null) => {
    if (!imageUrl) return 'https://via.placeholder.com/300';
    return imageUrl;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando detalhes do estabelecimento...</p>
      </div>
    );
  }

  if (error || !establishment) {
    return (
      <div className="error-container">
        <p>{error || 'Estabelecimento não encontrado'}</p>
        <button onClick={() => navigate(-1)} className="back-button">
          Voltar
        </button>
      </div>
    );
  }

  // Filtra os produtos baseado no estado showAllProducts
  const displayedProducts = showAllProducts 
    ? products 
    : products.slice(0, PRODUCTS_PER_PAGE);

  const hasMoreProducts = products.length > PRODUCTS_PER_PAGE;

  return (
    <div className="establishment-details">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← Voltar
      </button>

      <div className="details-header">
        <h1>{establishment.storeName}</h1>
        <div className="establishment-info">
          <span className={`status-badge ${establishment.isBlocked ? 'inactive' : 'active'}`}>
            {establishment.isBlocked ? 'Bloqueado' : 'Ativo'}
          </span>
          <span className="rating">⭐ {establishment.rating}</span>
        </div>
      </div>

      <div className="details-content">
        <section className="info-section">
          <h2>Informações Gerais</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">Endereço</span>
              <span className="value">{`${establishment.street}, ${establishment.number}`}</span>
            </div>
            <div className="info-item">
              <span className="label">Complemento</span>
              <span className="value">{establishment.complement || 'Não informado'}</span>
            </div>
            <div className="info-item">
              <span className="label">Horário de Funcionamento</span>
              <span className="value">{establishment.openingHours || 'Não informado'}</span>
            </div>
            <div className="info-item">
              <span className="label">Pedido Mínimo</span>
              <span className="value">R$ {Number(establishment.minimumOrderValue).toFixed(2)}</span>
            </div>
            <div className="info-item">
              <span className="label">Telefone</span>
              <span className="value">{establishment.phone}</span>
            </div>
            <div className="info-item">
              <span className="label">Email</span>
              <span className="value">{establishment.email}</span>
            </div>
            <div className="info-item">
              <span className="label">CNPJ/CPF</span>
              <span className="value">{establishment.cnpj_or_cpf}</span>
            </div>
            <div className="info-item">
              <span className="label">Cadastrado em</span>
              <span className="value">{establishment.createdAt.toDate().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </section>

        <section className="products-section">
          <h2>Produtos</h2>
          <div className="products-grid">
            {displayedProducts.map(product => (
              <div key={product.id} className="product-card">
                <img 
                  src={getImageUrl(product.image)} 
                  alt={product.name}
                  className="product-image"
                />
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p className="product-description">{product.description}</p>
                  <div className="product-price">
                    {product.isPromotion && product.promotionalPrice ? (
                      <>
                        <span className="original-price">R$ {Number(product.price).toFixed(2)}</span>
                        <span className="promotional-price">R$ {Number(product.promotionalPrice).toFixed(2)}</span>
                      </>
                    ) : (
                      <span>R$ {Number(product.price).toFixed(2)}</span>
                    )}
                  </div>
                  <span className={`status-badge ${product.isActive ? 'active' : 'inactive'}`}>
                    {product.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {hasMoreProducts && (
            <button 
              className="show-more-button"
              onClick={() => setShowAllProducts(!showAllProducts)}
            >
              {showAllProducts ? 'Mostrar menos' : 'Mostrar mais'}
            </button>
          )}
        </section>
      </div>
    </div>
  );
};

export default EstablishmentDetails; 