import { useIntl } from '@umijs/max';
import { Button, Input, Space } from 'antd';
import { useState } from 'react';

export default function LiveChatComposer({
  disabled,
  disabledReason,
  onSubmit,
}: {
  disabled: boolean;
  disabledReason?: string;
  onSubmit: (content: string) => Promise<void>;
}) {
  const intl = useIntl();
  const [value, setValue] = useState('');

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Input.TextArea
        rows={3}
        disabled={disabled}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={
          disabled && disabledReason
            ? disabledReason
            : intl.formatMessage({ id: 'live.chat.input.placeholder' })
        }
      />
      <Space style={{ width: '100%', justifyContent: 'end' }}>
        <Button
          type="primary"
          disabled={disabled}
          onClick={async () => {
            const content = value.trim();
            if (!content) return;
            await onSubmit(content);
            setValue('');
          }}
        >
          {intl.formatMessage({ id: 'live.room.chatSend' })}
        </Button>
      </Space>
    </Space>
  );
}
