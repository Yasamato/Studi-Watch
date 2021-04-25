import React from "react";
import socketIOClient, {Socket} from "socket.io-client";
import {Button, ButtonGroup, Col, Row} from "react-bootstrap";
import ReactPlayer from "react-player";
import "./Room.css";
import {BsPauseFill, BsPlayFill, FaPlay, FaVolumeMute, FaVolumeUp, ImLoop} from "react-icons/all";
import {Helmet} from "react-helmet";
import User from "./User";

const ENDPOINT = process.env.REACT_APP_DOCKER ? "" : "http://localhost:8081";

interface RoomProps {
    roomId: string
}

interface RoomState {
    id: string,
    url: string,
    owner: UserData,
    playing: boolean,
    volume: number,
    muted: boolean,
    played: number,
    loaded: number,
    duration: number,
    playbackRate: number,
    loop: boolean,
    ready: boolean,
    buffering: boolean,
    seeking: boolean,
    users: UserData[]
}

export interface UserData extends RoomState {
    name: string,
    icon: string
}

class Room extends React.Component<RoomProps, RoomState> {
    player: React.RefObject<ReactPlayer>;
    socket?: Socket;

    constructor(props: RoomProps) {
        super(props);
        this.player = React.createRef<ReactPlayer>();

        this.state = {
            id: this.props.roomId,
            owner: {
                name: "loading..."
            } as UserData,
            url: "https://youtu.be/Bi11Iid2hmo",
            playing: true,
            volume: 0.3,
            muted: true,
            played: 0,
            loaded: 0,
            duration: 0,
            playbackRate: 1,
            loop: false,
            ready: false,
            buffering: false,
            seeking: false,
            users: [] as UserData[]
        };
    }

    componentDidMount() {
        this.socket = socketIOClient(ENDPOINT, {
            query: {
                roomId: this.props.roomId
            }
        });
        this.socket.emit("update", {
            url: this.state.url,
            playing: this.state.playing,
            volume: this.state.volume,
            muted: this.state.muted,
            played: this.state.played,
            loaded: this.state.loaded,
            duration: this.state.duration,
            playbackRate: this.state.playbackRate,
            loop: this.state.loop,
            ready: this.state.ready,
            buffering: this.state.buffering,
            seeking: this.state.seeking,
        });

        this.socket.on("status", (data) => {
            console.debug("Update from server:", data);

            if (data.played) {
                if (Math.abs(this.state.played - data.played) * this.state.duration > 2) {
                    this.player.current?.seekTo(data.played, 'fraction');
                }
            }
            this.setState(data);
        });
    }

    componentWillUnmount() {
        if (this.socket!.connected) {
            this.socket!.disconnect();
        }
    }

    updateState(data: any) {
        if (this.socket) {
            console.debug("Updating to remote:", data);
            this.socket.emit("update", data);
        }
        this.setState(data);
    }

    changeToURL(url: string) {
        if (ReactPlayer.canPlay(url)) {
            this.load(url);
        } else {
            console.log("Error, cannot play url:", url);
        }
    }

    load(url: string) {
        this.updateState({
            url: url,
            ready: false,
            played: 0,
            loaded: 0,
            playing: true
        });
    }

    handleSeekMouseDown(e: any) {
        this.updateState({seeking: true})
    }

    handleSeekChange(e: any) {
        this.updateState({played: parseFloat(e.target.value)})
    }

    handleSeekMouseUp(e: any) {
        this.updateState({seeking: false})
        this.player.current?.seekTo(parseFloat(e.target.value))
    }


    render() {
        return (
            <>
                <Row className={"m-0 mb-2 px-4"}>
                    <Helmet>
                        <title>
                            Room {this.props.roomId} | {this.state.url}
                        </title>
                        <link rel="canonical" href={"/room/" + this.props.roomId}/>
                    </Helmet>
                    <Col className={"p-0"}>
                        <ReactPlayer
                            style={{
                                maxHeight: "calc(100vh - 169px)",
                                minHeight: "480px"
                            }}
                            ref={this.player}
                            className='react-player'
                            width='100%'
                            height={"calc((9 / 16) * 100vw)"}
                            url={this.state.url}
                            pip={true}
                            playing={this.state.playing}
                            controls={true}
                            loop={this.state.loop}
                            playbackRate={this.state.playbackRate}
                            volume={this.state.volume}
                            muted={this.state.muted}
                            onReady={() => this.updateState({ready: true})}
                            onStart={() => console.log('onStart')}
                            onPlay={() => this.updateState({playing: true})}
                            onPause={() => this.updateState({playing: false})}
                            onBuffer={() => this.updateState({buffering: true})}
                            onBufferEnd={() => this.updateState({buffering: false})}
                            onSeek={e => console.log('onSeek', e)}
                            onEnded={() => {
                                if (this.state.loop) {
                                    this.updateState({
                                        playing: true,
                                        played: 0
                                    })
                                } else {
                                    this.updateState({playing: false})
                                }
                            }}
                            onError={e => console.log('onError', e)}
                            onProgress={progress => {
                                // We only want to update time slider if we are not currently seeking
                                if (!this.state.seeking) {
                                    this.updateState(progress)
                                }
                            }}
                            onDuration={duration => this.updateState({duration: duration})}
                        />
                    </Col>
                    <Col xs={"auto"} className={"p-0"}>
                        <ButtonGroup vertical>
                            <Button onClick={() => this.updateState({playing: !this.state.playing})}
                                    variant={"outline-secondary"}>
                                {this.state.playing ? (<BsPauseFill/>) : (<BsPlayFill/>)}
                            </Button>
                            <Button onClick={() => this.updateState({muted: !this.state.muted})}
                                    variant={"outline-secondary"}>
                                {this.state.muted ? (<FaVolumeMute/>) : (<FaVolumeUp/>)}
                            </Button>
                            <Button onClick={() => this.updateState({loop: !this.state.loop})}
                                    variant={"outline-secondary"}>
                                {this.state.loop ? (<ImLoop/>) : (<FaPlay/>)}
                            </Button>
                        </ButtonGroup>
                    </Col>
                </Row>
                <Row>
                    {this.state.users.map(user => <User key={user.id} user={user}/>)}
                </Row>
            </>
        );
    }
}

export default Room;