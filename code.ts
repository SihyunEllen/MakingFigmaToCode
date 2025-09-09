// This plugin will generate a sample codegen plugin
// that appears in the Element tab of the Inspect panel.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// This provides the callback to generate the code.
interface ConvertedNode {
  type: 'Text' | 'TouchableOpacity' | 'View' | 'Image';
  props: Record<string, any>;
  children?: ConvertedNode[];
  text?: string;
  className?: string;
}

interface TSXGenerationOptions {
  indentSize: number;
  useSpaces: boolean;
}

class NodeConverter {
  
  // TextNode를 Text로 변환 (React Native + NativeWind)
  private convertTextNode(node: TextNode): ConvertedNode {
    const fontSize = node.fontSize as number || 14;
    const fontWeight = node.fontWeight as number || 400;
    const textAlign = node.textAlignHorizontal || 'LEFT';
    const color = this.extractColor(node.fills);
    
    // NativeWind 클래스 생성
    const className = this.generateTextClassName(fontSize, fontWeight, textAlign, color);
    
    return {
      type: 'Text',
      props: {},
      className,
      text: node.characters
    };
  }

  // InstanceNode를 TouchableOpacity 또는 Image로 변환 (React Native + NativeWind)
  private async convertInstanceNode(node: InstanceNode): Promise<ConvertedNode> {
    const mainComponent = await node.getMainComponentAsync();
    const componentName = mainComponent?.name || '';
    const isButton = this.isButtonComponent(componentName);
    const isIcon = this.isSvgIconComponent(componentName);
    
    if (isButton) {
      const className = this.generateButtonClassName(node);
      return {
        type: 'TouchableOpacity',
        props: {},
        className,
        children: await this.convertChildren(node.children)
      };
    } else if (isIcon) {
      const className = this.generateImageClassName(node);
      return {
        type: 'Image',
        props: {
          source: `{require('./assets/icons/${componentName.toLowerCase().replace(/\s+/g, '-')}.png')}`
        },
        className
      };
    } else {
      // 기본적으로 TouchableOpacity로 처리
      const className = this.generateButtonClassName(node);
      return {
        type: 'TouchableOpacity',
        props: {},
        className,
        children: await this.convertChildren(node.children)
      };
    }
  }

  // FrameNode를 View로 변환 (React Native + NativeWind)
  private async convertFrameNode(node: FrameNode): Promise<ConvertedNode> {
    const hasAutoLayout = node.layoutMode !== 'NONE';
    const className = this.generateViewClassName(node, hasAutoLayout);
    
    return {
      type: 'View',
      props: {},
      className,
      children: await this.convertChildren(node.children)
    };
  }

  // 메인 변환 함수
  public async convertNode(node: SceneNode): Promise<ConvertedNode> {
    switch (node.type) {
      case 'TEXT':
        return this.convertTextNode(node as TextNode);
      case 'INSTANCE':
        return await this.convertInstanceNode(node as InstanceNode);
      case 'FRAME':
        return this.convertFrameNode(node as FrameNode);
      default:
        // 기본적으로 View로 처리
        return {
          type: 'View',
          props: {},
          className: `w-[${Math.round(node.width || 0)}px] h-[${Math.round(node.height || 0)}px]`
        };
    }
  }

  // 재귀적으로 자식 노드들을 변환
  private async convertChildren(children: readonly SceneNode[]): Promise<ConvertedNode[]> {
    if (!children || children.length === 0) {
      return [];
    }
    
    const results = await Promise.all(children.map(child => this.convertNode(child)));
    return results;
  }

  // NativeWind 클래스 생성 함수들
  private generateTextClassName(fontSize: number, fontWeight: number, textAlign: string, color: string): string {
    const classes = [];
    
    // 폰트 크기
    if (fontSize <= 12) classes.push('text-xs');
    else if (fontSize <= 14) classes.push('text-sm');
    else if (fontSize <= 16) classes.push('text-base');
    else if (fontSize <= 18) classes.push('text-lg');
    else if (fontSize <= 20) classes.push('text-xl');
    else if (fontSize <= 24) classes.push('text-2xl');
    else if (fontSize <= 30) classes.push('text-3xl');
    else classes.push('text-4xl');
    
    // 폰트 굵기
    if (fontWeight <= 300) classes.push('font-light');
    else if (fontWeight <= 400) classes.push('font-normal');
    else if (fontWeight <= 500) classes.push('font-medium');
    else if (fontWeight <= 600) classes.push('font-semibold');
    else if (fontWeight <= 700) classes.push('font-bold');
    else classes.push('font-black');
    
    // 텍스트 정렬
    if (textAlign === 'CENTER') classes.push('text-center');
    else if (textAlign === 'RIGHT') classes.push('text-right');
    else classes.push('text-left');
    
    // 색상 (hex로 변환)
    const hexColor = this.rgbaToHex(color);
    if (hexColor !== '#000000') {
      classes.push(`text-[${hexColor}]`);
    }
    
    return classes.join(' ');
  }

  private generateButtonClassName(node: InstanceNode | FrameNode): string {
    const classes = [];
    
    // 크기
    classes.push(`w-[${Math.round(node.width)}px]`);
    classes.push(`h-[${Math.round(node.height)}px]`);
    
    // 배경색
    const bgColor = this.extractColor(node.fills);
    const hexBgColor = this.rgbaToHex(bgColor);
    if (hexBgColor !== 'transparent') {
      classes.push(`bg-[${hexBgColor}]`);
    }
    
    // 테두리 반경
    const borderRadius = this.extractBorderRadius(node);
    if (typeof borderRadius === 'number' && borderRadius > 0) {
      if (borderRadius <= 2) classes.push('rounded-sm');
      else if (borderRadius <= 4) classes.push('rounded');
      else if (borderRadius <= 6) classes.push('rounded-md');
      else if (borderRadius <= 8) classes.push('rounded-lg');
      else if (borderRadius <= 12) classes.push('rounded-xl');
      else if (borderRadius <= 16) classes.push('rounded-2xl');
      else if (borderRadius >= node.height / 2) classes.push('rounded-full');
      else classes.push(`rounded-[${borderRadius}px]`);
    }
    
    // 기본 스타일
    classes.push('items-center justify-center');
    
    return classes.join(' ');
  }

  private generateImageClassName(node: InstanceNode): string {
    const classes = [];
    
    // 크기
    classes.push(`w-[${Math.round(node.width)}px]`);
    classes.push(`h-[${Math.round(node.height)}px]`);
    
    return classes.join(' ');
  }

  private generateViewClassName(node: FrameNode, hasAutoLayout: boolean): string {
    const classes = [];
    
    // 크기
    classes.push(`w-[${Math.round(node.width)}px]`);
    classes.push(`h-[${Math.round(node.height)}px]`);
    
    // 배경색
    const bgColor = this.extractColor(node.fills);
    const hexBgColor = this.rgbaToHex(bgColor);
    if (hexBgColor !== 'transparent') {
      classes.push(`bg-[${hexBgColor}]`);
    }
    
    // 테두리 반경
    const borderRadius = this.extractBorderRadius(node);
    if (typeof borderRadius === 'number' && borderRadius > 0) {
      if (borderRadius <= 2) classes.push('rounded-sm');
      else if (borderRadius <= 4) classes.push('rounded');
      else if (borderRadius <= 6) classes.push('rounded-md');
      else if (borderRadius <= 8) classes.push('rounded-lg');
      else if (borderRadius <= 12) classes.push('rounded-xl');
      else if (borderRadius <= 16) classes.push('rounded-2xl');
      else if (borderRadius >= Math.min(node.width, node.height) / 2) classes.push('rounded-full');
      else classes.push(`rounded-[${borderRadius}px]`);
    }
    
    // AutoLayout 관련
    if (hasAutoLayout) {
      // Flex 방향
      if (node.layoutMode === 'HORIZONTAL') {
        classes.push('flex-row');
      } else {
        classes.push('flex-col');
      }
      
      // 정렬
      const alignItems = this.convertAlignItemsToNativeWind(node.counterAxisAlignItems);
      const justifyContent = this.convertJustifyContentToNativeWind(node.primaryAxisAlignItems);
      
      if (alignItems) classes.push(alignItems);
      if (justifyContent) classes.push(justifyContent);
      
      // 간격 (gap)
      const spacing = node.itemSpacing || 0;
      if (spacing > 0) {
        if (spacing <= 1) classes.push('gap-0.5');
        else if (spacing <= 2) classes.push('gap-0.5');
        else if (spacing <= 4) classes.push('gap-1');
        else if (spacing <= 6) classes.push('gap-1.5');
        else if (spacing <= 8) classes.push('gap-2');
        else if (spacing <= 12) classes.push('gap-3');
        else if (spacing <= 16) classes.push('gap-4');
        else if (spacing <= 20) classes.push('gap-5');
        else if (spacing <= 24) classes.push('gap-6');
        else classes.push(`gap-[${spacing}px]`);
      }
      
      // 패딩
      const paddingClasses = this.generatePaddingClasses(node);
      classes.push(...paddingClasses);
    }
    
    return classes.join(' ');
  }

  private generatePaddingClasses(node: FrameNode): string[] {
    const classes = [];
    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;
    
    // 모든 패딩이 같은 경우
    if (top === right && right === bottom && bottom === left && top > 0) {
      if (top <= 1) classes.push('p-0.5');
      else if (top <= 2) classes.push('p-0.5');
      else if (top <= 4) classes.push('p-1');
      else if (top <= 6) classes.push('p-1.5');
      else if (top <= 8) classes.push('p-2');
      else if (top <= 12) classes.push('p-3');
      else if (top <= 16) classes.push('p-4');
      else if (top <= 20) classes.push('p-5');
      else if (top <= 24) classes.push('p-6');
      else classes.push(`p-[${top}px]`);
    } else {
      // 개별 패딩
      if (top > 0) {
        if (top <= 4) classes.push('pt-1');
        else if (top <= 8) classes.push('pt-2');
        else if (top <= 12) classes.push('pt-3');
        else if (top <= 16) classes.push('pt-4');
        else classes.push(`pt-[${top}px]`);
      }
      if (right > 0) {
        if (right <= 4) classes.push('pr-1');
        else if (right <= 8) classes.push('pr-2');
        else if (right <= 12) classes.push('pr-3');
        else if (right <= 16) classes.push('pr-4');
        else classes.push(`pr-[${right}px]`);
      }
      if (bottom > 0) {
        if (bottom <= 4) classes.push('pb-1');
        else if (bottom <= 8) classes.push('pb-2');
        else if (bottom <= 12) classes.push('pb-3');
        else if (bottom <= 16) classes.push('pb-4');
        else classes.push(`pb-[${bottom}px]`);
      }
      if (left > 0) {
        if (left <= 4) classes.push('pl-1');
        else if (left <= 8) classes.push('pl-2');
        else if (left <= 12) classes.push('pl-3');
        else if (left <= 16) classes.push('pl-4');
        else classes.push(`pl-[${left}px]`);
      }
    }
    
    return classes;
  }

  private convertAlignItemsToNativeWind(align: string | undefined): string | null {
    switch (align) {
      case 'MIN': return 'items-start';
      case 'MAX': return 'items-end';
      case 'CENTER': return 'items-center';
      case 'BASELINE': return 'items-baseline';
      default: return null;
    }
  }

  private convertJustifyContentToNativeWind(align: string | undefined): string | null {
    switch (align) {
      case 'MIN': return 'justify-start';
      case 'MAX': return 'justify-end';
      case 'CENTER': return 'justify-center';
      case 'SPACE_BETWEEN': return 'justify-between';
      default: return null;
    }
  }

  private rgbaToHex(rgba: string): string {
    if (rgba === 'transparent') return 'transparent';
    
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return '#000000';
    
    const [, r, g, b, a] = match;
    const alpha = a ? parseFloat(a) : 1;
    
    if (alpha === 0) return 'transparent';
    
    const toHex = (n: number) => {
      const hex = Math.round(n).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${toHex(parseInt(r))}${toHex(parseInt(g))}${toHex(parseInt(b))}`;
  }

  // 유틸리티 함수들
  private isButtonComponent(name: string): boolean {
    const buttonKeywords = ['button', 'btn', 'cta', 'action'];
    return buttonKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }

  private isSvgIconComponent(name: string): boolean {
    const iconKeywords = ['icon', 'svg', 'symbol'];
    return iconKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }

  private extractColor(fills: readonly Paint[] | PluginAPI['mixed']): string {
    if (!fills || fills === figma.mixed || !Array.isArray(fills)) {
      return 'transparent';
    }
    
    const solidFill = fills.find(fill => fill.type === 'SOLID') as SolidPaint;
    if (solidFill) {
      const { r, g, b } = solidFill.color;
      const opacity = solidFill.opacity || 1;
      return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${opacity})`;
    }
    
    return 'transparent';
  }

  private extractBorderRadius(node: any): number | string {
    if (node.cornerRadius !== undefined) {
      return node.cornerRadius;
    }
    if (node.topLeftRadius !== undefined) {
      const { topLeftRadius, topRightRadius, bottomRightRadius, bottomLeftRadius } = node;
      if (topLeftRadius === topRightRadius && topRightRadius === bottomRightRadius && bottomRightRadius === bottomLeftRadius) {
        return topLeftRadius;
      }
      return `${topLeftRadius}px ${topRightRadius}px ${bottomRightRadius}px ${bottomLeftRadius}px`;
    }
    return 0;
  }

  private extractPadding(node: FrameNode): string {
    const top = node.paddingTop || 0;
    const right = node.paddingRight || 0;
    const bottom = node.paddingBottom || 0;
    const left = node.paddingLeft || 0;
    
    if (top === right && right === bottom && bottom === left) {
      return `${top}px`;
    }
    return `${top}px ${right}px ${bottom}px ${left}px`;
  }

  private convertAlignItems(align: string | undefined): string {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'MAX': return 'flex-end';
      case 'CENTER': return 'center';
      case 'BASELINE': return 'baseline';
      default: return 'stretch';
    }
  }

  private convertJustifyContent(align: string | undefined): string {
    switch (align) {
      case 'MIN': return 'flex-start';
      case 'MAX': return 'flex-end';
      case 'CENTER': return 'center';
      case 'SPACE_BETWEEN': return 'space-between';
      default: return 'flex-start';
    }
  }
}
class TSXGenerator {
  private options: TSXGenerationOptions;

  constructor(options: TSXGenerationOptions = { indentSize: 2, useSpaces: true }) {
    this.options = options;
  }

  public generateTSX(convertedNode: ConvertedNode, depth: number = 0): string {
    const indent = this.getIndent(depth);
    const { type, props, children, text, className } = convertedNode;

    const propsString = this.propsToString(props);
    const classNameString = className ? ` className="${className}"` : '';
    const allProps = propsString + classNameString;

    if (children && children.length > 0) {
      const childrenTSX = children
        .map(child => this.generateTSX(child, depth + 1))
        .join('\n');
      return `${indent}<${type}${allProps}>\n${childrenTSX}\n${indent}</${type}>`;
    }

    if (text) {
      return `${indent}<${type}${allProps}>${text}</${type}>`;
    }

    return `${indent}<${type}${allProps} />`;
  }

  private getIndent(depth: number): string {
    const char = this.options.useSpaces ? ' ' : '\t';
    const size = this.options.useSpaces ? this.options.indentSize : 1;
    return char.repeat(depth * size);
  }

  private propsToString(props: Record<string, any>): string {
    const propKeys = Object.keys(props);
    if (propKeys.length === 0) return '';

    const propStrings = propKeys.map((key: string) => {
      const value = props[key];
      if (typeof value === 'string') return `${key}="${value}"`;
      if (typeof value === 'number') return `${key}={${value}}`;
      if (typeof value === 'boolean') return value ? key : `${key}={false}`;
      return `${key}={${JSON.stringify(value)}}`;
    });

    return ' ' + propStrings.join(' ');
  }
}

// ✅ Codegen 엔트리포인트
figma.codegen.on("generate", async (event): Promise<CodegenResult[]> => {
  const converter = new NodeConverter();
  const generator = new TSXGenerator();

  const nodes = event.node ? [event.node] : [];
  if (nodes.length === 0) {
    return [
      {
        title: "Error",
        code: "노드를 선택해주세요.",
        language: "TYPESCRIPT",
      },
    ];
  }

  try {
    const convertedNode = await converter.convertNode(nodes[0]);
    const tsxCode = generator.generateTSX(convertedNode);

    return [
      {
        title: "React Native TSX",
        code: tsxCode,
        language: "TYPESCRIPT",
      },
    ];
  } catch (err) {
    console.error("Codegen Error:", err);
    return [
      {
        title: "Error",
        code: String(err),
        language: "TYPESCRIPT",
      },
    ];
  }
});
