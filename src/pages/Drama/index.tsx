import DramaCard from '@/components/drama/DramaCard';
import PageIntroCard from '@/components/PageIntroCard';
import { getDramaList } from '@/services/drama';
import type { DramaSeries } from '@/types/drama';
import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Alert, Col, Empty, Row, Spin } from 'antd';
import { useEffect, useState } from 'react';

export default function DramaPage() {
  const intl = useIntl();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<DramaSeries[]>([]);

  useEffect(() => {
    setLoading(true);
    setErrorMessage('');

    getDramaList()
      .then((response) => setItems(response.results || []))
      .catch((error: any) => {
        setErrorMessage(
          error?.message || intl.formatMessage({ id: 'drama.error.loadList' }),
        );
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [intl]);

  return (
    <PageContainer title={false}>
      <div style={{ padding: '8px 8px 20px' }}>
        <PageIntroCard
          title={intl.formatMessage({ id: 'drama.title' })}
          description={intl.formatMessage({ id: 'drama.subtitle' })}
        />

        {errorMessage ? (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 14 }}
            message={errorMessage}
          />
        ) : null}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description={intl.formatMessage({ id: 'drama.empty' })} />
        ) : (
          <Row gutter={[12, 14]}>
            {items.map((item) => (
              <Col key={String(item.id)} xs={12} sm={8} md={6} lg={4}>
                <DramaCard item={item} />
              </Col>
            ))}
          </Row>
        )}
      </div>
    </PageContainer>
  );
}
