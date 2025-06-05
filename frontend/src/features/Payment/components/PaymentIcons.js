// Em frontend/src/components/payment/PaymentIcons.js
import { ReactComponent as MBWaySVG } from '../../assets/images/mbway.svg';
import { ReactComponent as MultibancoSVG } from '../../assets/images/multibanco.svg';

export const MBWayIcon = ({ sx, ...props }) => (
  <MBWaySVG style={{ width: 24, height: 24, ...sx }} {...props} />
);

export const MultibancoIcon = ({ sx, ...props }) => (
  <MultibancoSVG style={{ width: 24, height: 24, ...sx }} {...props} />
);