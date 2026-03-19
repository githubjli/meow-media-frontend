import { getLiveList } from '@/services/live';
import { UserOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useRequest } from '@umijs/max';
import { Avatar, Badge, Card, Col, Row, Spin, Typography } from 'antd';

const { Text } = Typography;

export default () => {
  // 🚩 这里的 data 就是 Service 打印出来的 res
  const { data, loading } = useRequest(getLiveList);

  // 1. 解析数据：根据你截图里看到的数组结构
  const apiList = Array.isArray(data) ? data : [];

  return (
    <PageContainer title="Live Streams">
      <Spin spinning={loading} tip="Parsing API Data...">
        <Row gutter={[24, 24]}>
          {apiList.map((item: any) => (
            <Col xs={24} sm={12} md={8} lg={6} key={item.streamId}>
              <Card
                hoverable
                style={{ borderRadius: 12, overflow: 'hidden' }}
                onClick={() => history.push(`/room/${item.streamId}`)}
                cover={
                  <div
                    style={{
                      position: 'relative',
                      height: 180,
                      backgroundColor: '#000',
                    }}
                  >
                    <img
                      src={
                        item.previewUrl ||
                        `/images/covers/cover${(Math.random() * 8).toFixed(
                          0,
                        )}.jpg`
                      }
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* 🚩 核心：点亮逻辑 */}
                    <div style={{ position: 'absolute', top: 12, left: 12 }}>
                      <Badge
                        status={
                          item.status === 'broadcasting'
                            ? 'processing'
                            : 'default'
                        }
                        color={
                          item.status === 'broadcasting' ? '#f5222d' : '#8c8c8c'
                        }
                        text={item.status.toUpperCase()}
                      />
                    </div>
                  </div>
                }
              >
                <Card.Meta
                  avatar={
                    <Avatar
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#5bd1d7' }}
                    />
                  }
                  title={item.name || item.streamId}
                  description={`Status: ${item.status}`}
                />
              </Card>
            </Col>
          ))}
          {/* 如果列表为空，显示友好提示 */}
          {!loading && apiList.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', width: '100%' }}>
              <Text type="secondary">No active streams found on server.</Text>
            </div>
          )}
        </Row>
      </Spin>
    </PageContainer>
  );
};
