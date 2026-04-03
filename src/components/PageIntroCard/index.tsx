import { Card, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import styles from './index.less';

const { Text, Title } = Typography;

export default function PageIntroCard({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card variant="borderless" className={styles.card}>
      <Space direction="vertical" size={0} className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.copy}>
            {eyebrow ? <Text className={styles.eyebrow}>{eyebrow}</Text> : null}
            <Title level={2} className={styles.title}>
              {title}
            </Title>
            {description ? (
              <Text className={styles.description}>{description}</Text>
            ) : null}
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
        {children ? <div className={styles.content}>{children}</div> : null}
      </Space>
    </Card>
  );
}
