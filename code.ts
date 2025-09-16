console.log("🔥 HOT TEST!");
export const colors = {
  dark : "#1E1E1E",
  white: "#FAFAF8",
  blue: "#007AFF",
  gray: "#8B8383",
  lightGray: "#D9D9D9",
  blueGray:"94A3B8",
  green: "0CEC80"
};

export const fontSizes = {
  xs: 10,   
  sm: 12,   
  base: 14, 
  md: 16,   
  lg: 18,   
  xl: 20, 
  "2xl": 22,
  "3xl": 24,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  smd:12,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 4,
  md: 10,
  lg: 16,
};

export interface ConvertedNode {
  type: 'Text' | 'TouchableOpacity' | 'View' | 'Image' | 'Button';
  props: Record<string, any>;
  children?: ConvertedNode[];
  text?: string;
  className?: string;
  tsxString?: string; // Button 타입일 때 사용
  importStatement?: string;  // 추가
}

export interface TSXGenerationOptions {
  indentSize: number;
  useSpaces: boolean;
}

// Symbol 값 안전 처리 유틸리티 함수들
export function isSymbol(value: any): boolean {
  return typeof value === "symbol";
}

export function safeNumber(value: any, defaultValue: number = 0): number {
  if (isSymbol(value)) {
    console.warn("Symbol 값 감지, 기본값 반환:", defaultValue);
    return defaultValue;
  }
  
  // undefined, null 처리
  if (value === undefined || value === null) {
    console.warn("undefined/null 값 감지, 기본값 반환:", defaultValue);
    return defaultValue;
  }
  
  // 문자열 숫자 변환 시도
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  
  if (typeof value !== "number" || isNaN(value)) {
    console.warn("유효하지 않은 숫자 값, 기본값 반환:", defaultValue, "받은 값:", value);
    return defaultValue;
  }
  return value;
}

export function safeString(value: any, defaultValue: string = ""): string {
  if (isSymbol(value)) {
    console.warn("Symbol 값 감지, 기본값 반환:", defaultValue);
    return defaultValue;
  }
  if (typeof value !== "string") {
    console.warn("유효하지 않은 문자열 값, 기본값 반환:", defaultValue);
    return defaultValue;
  }
  return value;
}

// fontWeight 전용 안전 변환 함수
export function safeFontWeight(value: any): number {
  if (isSymbol(value)) {
    console.warn("Symbol fontWeight 감지, 기본값 400 반환");
    return 400;
  }
  
  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }
  
  if (typeof value === "string") {
    // 문자열 fontWeight를 숫자로 변환
    const lowerValue = value.toLowerCase();
    switch (lowerValue) {
      case "thin": case "100": return 100;
      case "extralight": case "ultralight": case "200": return 200;
      case "light": case "300": return 300;
      case "normal": case "regular": case "400": return 400;
      case "medium": case "500": return 500;
      case "semibold": case "demibold": case "600": return 600;
      case "bold": case "700": return 700;
      case "extrabold": case "ultrabold": case "800": return 800;
      case "black": case "heavy": case "900": return 900;
      default: return 400;
    }
  }
  
  console.warn("알 수 없는 fontWeight 값, 기본값 400 반환:", value);
  return 400;
}

// fontSize 전용 안전 변환 함수
export function safeFontSize(value: any, defaultValue: number = 14): number {
  if (isSymbol(value)) {
    console.warn("Symbol fontSize 감지, 기본값 반환:", defaultValue);
    return defaultValue;
  }
  
  if (typeof value === "number" && !isNaN(value) && value > 0) {
    return value;
  }
  
  console.warn("유효하지 않은 fontSize 값, 기본값 반환:", defaultValue, "받은 값:", value);
  return defaultValue;
}

// 안전한 노드 크기 추출 함수
export function getNodeSizeSafe(node: SceneNode): { width: number; height: number } {
  const width = safeNumber(node.width, 0);
  const height = safeNumber(node.height, 0);

  return { width, height };
}

export class NodeConverter {
  
  // TextNode를 Text로 변환 (React Native + NativeWind)
  private convertTextNode(node: TextNode): ConvertedNode {
    const fontSize = safeFontSize(node.fontSize, fontSizes.base);
    const fontWeight = safeFontWeight(node.fontWeight);
    const textAlign = safeString(node.textAlignHorizontal, 'LEFT');
    const color = 'default'; // 기본 텍스트 색상 사용
    
    // NativeWind 클래스 생성
    const className = this.generateTextClassName(fontSize, fontWeight, textAlign, color);
    
    return {
      type: 'Text',
      props: {},
      className,
      text: node.characters
    };
  }

  //ComponentNode를 Button 또는 Image로 변환 (React Native + NativeWind)
  private async convertInstanceNode(node: InstanceNode): Promise<ConvertedNode> {
    const mainComponent = await node.getMainComponentAsync();
    const componentName = mainComponent?.name || '';
    const isButton = this.isButtonComponent(componentName);
    const isIcon = this.isSvgIconComponent(componentName);
    
    console.log("Component name:", componentName);
    console.log("Is button:", isButton);
    
    if (isButton) {
      const children = await this.convertChildren(node.children);
      const tsxString = this.parseButtonToTSX(componentName, children);
      
      return {
        type: 'Button',
        props: {},
        tsxString: tsxString
      };
    } else if (isIcon) {
      const iconName = componentName.toLowerCase().replace(/\s+/g, '_');
      return {
        type: 'Image',
        props: {
          source: `{${iconName}}`  // {icn_walk} 형태로
        },
        className: `w-[24px] h-[24px]`, // 기본 아이콘 크기
        importStatement: `import ${iconName} from '@/assets/images/${iconName}.svg';`
      };
    } else {
      // 기본적으로 View로 처리
      const { width, height } = getNodeSizeSafe(node);
      return {
        type: 'View',
        props: {},
        className: `w-[${Math.round(width)}px] h-[${Math.round(height)}px]`,
        children: await this.convertChildren(node.children)
      };
    }
  }

  // ComponentNode를 Button 또는 Image로 변환 (React Native + NativeWind)
  private async convertComponentNode(node: ComponentNode): Promise<ConvertedNode> {
    const componentName = node.name || '';
    const isButton = this.isButtonComponent(componentName);
    const isIcon = this.isSvgIconComponent(componentName);
    
    console.log("Component name:", componentName);
    console.log("Is button:", isButton);
    
    if (isButton) {
      const children = await this.convertChildren(node.children);
      const tsxString = this.parseButtonToTSX(componentName, children);
      
      return {
        type: 'Button',
        props: {},
        tsxString: tsxString
      };
    } else if (isIcon) {
      const iconName = componentName.toLowerCase().replace(/\s+/g, '_');
      return {
        type: 'Image',
        props: {
          source: `{${iconName}}`
        },
        className: `w-[24px] h-[24px]`,
        importStatement: `import ${iconName} from '@/assets/images/${iconName}.svg';`
      };
    } else {
      // 기본적으로 View로 처리
      const { width, height } = getNodeSizeSafe(node);
      return {
        type: 'View',
        props: {},
        className: `w-[${Math.round(width)}px] h-[${Math.round(height)}px]`,
        children: await this.convertChildren(node.children)
      };
    }
  }

  // 메인 변환 함수 (TEXT, INSTANCE, COMPONENT 처리)
  public async convertNode(node: SceneNode): Promise<ConvertedNode> {
    switch (node.type) {
      case 'TEXT':
        return this.convertTextNode(node as TextNode);
      case 'INSTANCE':
        return await this.convertInstanceNode(node as InstanceNode);
      case 'COMPONENT':
        return await this.convertComponentNode(node as ComponentNode);
      default:
        // Frame이나 다른 노드는 처리하지 않음
        throw new Error(`지원하지 않는 노드 타입: ${node.type}`);
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
    if (fontSize <= fontSizes.xs) classes.push('text-xs');
    else if (fontSize <= fontSizes.sm) classes.push('text-sm');
    else if (fontSize <= fontSizes.base) classes.push('text-base');
    else if (fontSize <= fontSizes.md) classes.push('text-md');
    else if (fontSize <= fontSizes.lg) classes.push('text-lg');
    else if (fontSize <= fontSizes.xl) classes.push('text-xl');
    else if (fontSize <= fontSizes["2xl"]) classes.push('text-2xl');
    else if (fontSize <= fontSizes["3xl"]) classes.push('text-3xl');
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
    
    // 기본 텍스트 색상 사용 (색상 처리 생략)
    
    return classes.join(' ');
  }

  // 내가 정한 Button 컴포넌트 방식대로 변환하는 코드 
  private parseButtonToTSX(componentName: string, children: ConvertedNode[]): string {
    console.log("Component name:", componentName);
    // "Button/Rounded/Small" -> ["Button", "Rounded", "Small"]
    const parts = componentName.split('/');
    
    if (parts.length !== 3 || parts[0] !== 'Button') {
      return this.generateDefaultButtonTSX(componentName, children);
    }
    
    const [, designType, size] = parts;  // -> ["Button/Rounded/Small]이런식으로 이름 지었음
    
    // 디자인 타입을 컴포넌트 이름으로 변환 (첫 글자 대문자)
    const componentName_camelCase = designType.charAt(0).toUpperCase() + designType.slice(1).toLowerCase() + 'Button';
    
    // 자식 요소의 텍스트 추출
    const childrenText = this.extractChildrenText(children);
    
    return `<${componentName_camelCase} size="${size.toLowerCase()}">${childrenText}</${componentName_camelCase}>`;
  }
  
  private extractChildrenText(children: ConvertedNode[]): string {
    if (!children || children.length === 0) {
      return '';
    }
    
    // 첫 번째 텍스트 노드의 텍스트를 반환
    for (const child of children) {
      if (child.type === 'Text' && child.text) {
        return child.text;
      }
      // 재귀적으로 자식에서 텍스트 찾기
      if (child.children) {
        const nestedText = this.extractChildrenText(child.children);
        if (nestedText) {
          return nestedText;
        }
      }
    }
    
    return '';
  }
  
  private generateDefaultButtonTSX(componentName: string, children: ConvertedNode[]): string { //default 버튼
    const childrenText = this.extractChildrenText(children);
    return `<TouchableOpacity className="items-center justify-center px-4 py-3 bg-blue rounded-md">
    <Text className="text-white text-base font-medium">${childrenText}</Text>
  </TouchableOpacity>`;
  }


  // 유틸리티 함수들
  private isButtonComponent(name: string): boolean {
    const buttonKeywords = ['Button'];
    return buttonKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }

  private isSvgIconComponent(name: string): boolean {
    const iconKeywords = ['icn', 'svg', 'symbol'];
    return iconKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
  }

}
export class TSXGenerator {
  private options: TSXGenerationOptions;

  constructor(options: TSXGenerationOptions = { indentSize: 2, useSpaces: true }) {
    this.options = options;
  }

  public generateTSX(convertedNode: ConvertedNode, depth: number = 0): string {
    const indent = this.getIndent(depth);
    const { type, props, children, text, className, tsxString, importStatement } = convertedNode;

    const propsString = this.propsToString(props);
    const classNameString = className ? ` className="${className}"` : '';
    const allProps = propsString + classNameString;

    // tsxString이 있으면 최우선으로 반환 (Button용)
    if (tsxString) {
      return `${indent}${tsxString}`;
    }

    if (importStatement) {
      return `${indent}${importStatement}\n${indent}<${type}${allProps} />`;
    }

    if (children && children.length > 0) { // 자식 노드 재귀
      const childrenTSX = children
        .map(child => this.generateTSX(child, depth + 1)) // map 함수로 자식 노드 재귀
        .join('\n');
      return `${indent}<${type}${allProps}>\n${childrenTSX}\n${indent}</${type}>`;
    }

    if (text) {
      return `${indent}<${type}${allProps}>${text}</${type}>`;
    }

    return `${indent}<${type}${allProps} />`;
  }

  private getIndent(depth: number): string { // 들여쓰기 함수.
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
  console.log("Codegen started!");
  console.log("Event:", event);
  
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
