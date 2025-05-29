import { bind } from 'decko';
import { Component, h } from 'preact';
import { Xterm, XtermOptions } from './xterm';

import '@xterm/xterm/css/xterm.css';
import { Modal } from '../modal';

import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

interface Props extends XtermOptions {
    id: string;
}

interface State {
    modal: boolean;
    layoutName: string; // Add layoutName to the State interface
}

export class Terminal extends Component<Props, State> {
    private container: HTMLElement;
    private xterm: Xterm;
    private metaPending = false;
    private altPending = false;

    constructor(props: Props) {
        super(props);
        this.state = {
            modal: false,
            layoutName: 'default', // Initialize layoutName in the state
        };
        this.xterm = new Xterm(props, this.showModal);
    }

    async componentDidMount() {
        await this.xterm.refreshToken();
        this.xterm.open(this.container);
        this.xterm.connect();
    }

    componentWillUnmount() {
        this.xterm.dispose();
    }

    render({ id }: Props, { modal, layoutName }: State) {
        // Destructure layoutName from state
        return (
            <div id={id} ref={c => (this.container = c as HTMLElement)}>
                <Modal show={modal}>
                    <label class="file-label">
                        <input onChange={this.sendFile} class="file-input" type="file" multiple />
                        <span class="file-cta">Choose files…</span>
                    </label>
                </Modal>

                <Keyboard
                    layout={{
                        default: [
                            '{esc} ` 1 2 3 4 5 6 7 8 9 0 - = {bksp}',
                            '{lock} q w e r t y u i o p [ ] \\',
                            '{shift} a s d f g h j k l ;',
                            'z x c v b n m , . /',
                            '{ctrl} {alt} {spacebar} {enter}',
                        ],
                        shift: [
                            '{esc} ~ ! @ # $ % ^ & * ( ) _ + {bksp}',
                            '{lock} Q W E R T Y U I O P { } |',
                            '{shift} A S D F G H J K L : "',
                            'Z X C V B N M < > ? ',
                            '{ctrl} {alt} {spacebar} {enter}',
                        ],
                    }}
                    display={{
                        '{bksp}': '⌫',
                        '{enter}': '↵',
                        '{ctrl}': 'ctrl',
                        '{esc}': 'esc',
                        '{shift}': 'shift',
                        '{alt}': 'alt',
                        '{lock}': 'cpslck',
                        '{spacebar}': ' ',
                    }}
                    layoutName={layoutName} // Use layoutName from state
                    onKeyPress={this.onKeyPress}
                    onChangeLayout={layoutName => this.setState({ layoutName })} // Update layoutName in state
                />
                <footer>
                    vytvoreno kremikarnou{' '}
                    <a href="https://raw.githubusercontent.com/Grayfoox/NetHack/NetHack-3.7/nethack-guide-cz.pdf">
                        CZ manuál
                    </a>{' '}
                    - <a href="https://www.nethack.org/download/3.6.6/nethack-366-Guidebook.pdf">EN manuál</a> -{' '}
                    <a href="https://github.com/Grayfoox/NetHack/">link na source code</a>
                </footer>
            </div>
        );
    }

    @bind
    onChange(input: string) {
        console.log('Input changed', input);
    }

    @bind
    onKeyPress(button: string) {
        if (button === '{shift}' || button === '{lock}') {
            this.handleShift();
            return;
        }

        if (button === '{ctrl}') {
            this.metaPending = true;
            return;
        }
        if (button === '{alt}') {
            this.altPending = true;
            return;
        }

        if (this.metaPending) {
            const ch = button[0] || '';
            const code = ch.charCodeAt(0) & 0x1f;
            this.xterm.fcwrite(String.fromCharCode(code));
            this.metaPending = false;
            return;
        }

        if (this.altPending) {
            this.xterm.fcwrite('\x1b' + button);
            this.altPending = false;
            return;
        }

        switch (button) {
            case '{bksp}':
                this.xterm.fcwrite('\x7f');
                break;
            case '{esc}':
                this.xterm.fcwrite('\x1b');
                break;
            case '{enter}':
                this.xterm.fcwrite('\r');
                break;
            case '{spacebar}':
                this.xterm.fcwrite(' ');
                break;
            default:
                this.xterm.fcwrite(button);
        }
    }

    handleShift = () => {
        const layoutName = this.state.layoutName;

        this.setState({
            layoutName: layoutName === 'default' ? 'shift' : 'default',
        });
    };

    @bind
    showModal() {
        this.setState({ modal: true });
    }

    @bind
    sendFile(event: Event) {
        this.setState({ modal: false });
        const files = (event.target as HTMLInputElement).files;
        if (files) this.xterm.sendFile(files);
    }
}
