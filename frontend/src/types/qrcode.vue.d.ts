declare module 'qrcode.vue' {
  import { DefineComponent } from 'vue';

  interface QrcodeVueProps {
    value: string;
    size?: number;
    level?: 'L' | 'M' | 'Q' | 'H';
    background?: string;
    foreground?: string;
    renderAs?: 'canvas' | 'svg';
    margin?: number;
  }

  const QrcodeVue: DefineComponent<QrcodeVueProps>;
  export default QrcodeVue;
}
