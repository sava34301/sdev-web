import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_BITS_SRC from '../../../lang/stdlib/v2/bits.sdev?raw';
import SDEV_BUFFER_SRC from '../../../lang/stdlib/v2/buffer.sdev?raw';
import SDEV_DIALECT_SRC from '../../../lang/dialect/dialect.sdev?raw';

export const getDialectRunner = lazyModuleRunner(
  SDEV_TEXT_SRC,
  SDEV_BITS_SRC,
  SDEV_BUFFER_SRC,
  SDEV_DIALECT_SRC,
);
