import { createSdevModuleRunner, type SdevModuleRunner } from '../sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_BITS_SRC from '../../../lang/stdlib/v2/bits.sdev?raw';
import SDEV_BUFFER_SRC from '../../../lang/stdlib/v2/buffer.sdev?raw';
import SDEV_DIALECT_SRC from '../../../lang/dialect/dialect.sdev?raw';

let dialectRunner: SdevModuleRunner | null = null;

export function getDialectRunner(): SdevModuleRunner {
  if (!dialectRunner) {
    dialectRunner = createSdevModuleRunner(
      SDEV_TEXT_SRC,
      SDEV_BITS_SRC,
      SDEV_BUFFER_SRC,
      SDEV_DIALECT_SRC,
    );
  }
  return dialectRunner;
}
