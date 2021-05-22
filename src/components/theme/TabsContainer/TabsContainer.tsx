/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import './TabsContainer.css';

import React from 'react';

type PROPS = {
  children: any;
};

type STATE = {
  activeTabIndex: number;
  // [key: string]: number | string | unknown;
};

export default class Tabs extends React.Component<PROPS, STATE> {
  constructor(props: PROPS) {
    super(props);
    this.state = {
      activeTabIndex: 0,
    };
    this.handleTabClick = this.handleTabClick.bind(this);
  }

  handleTabClick(tabIndex: number) {
    this.setState({
      activeTabIndex:
        tabIndex === this.state.activeTabIndex
          ? this.state.activeTabIndex
          : tabIndex,
    });
  }

  // Encapsulate <Tabs/> component API as props for <Tab/> children
  renderChildrenWithTabsApiAsProps() {
    return React.Children.map(this.props.children, (child: any, index) => {
      return React.cloneElement(child, {
        onClick: this.handleTabClick,
        tabIndex: index,
        isActive: index === this.state.activeTabIndex,
      });
    });
  }

  // Render current active tab content
  renderActiveTabContent() {
    const { children } = this.props;
    const { activeTabIndex } = this.state;
    if (activeTabIndex === undefined) return null;

    if (children && children.props) {
      return children.props.children;
    }

    if (children != null && children[activeTabIndex]) {
      return children[activeTabIndex].props.children;
    }

    console.dir('Error! This tab has no children!');
  }

  render() {
    return (
      <div className="TabsContainer">
        <ul className="tabs-nav">{this.renderChildrenWithTabsApiAsProps()}</ul>
        <div className="tabs-active-content">
          {this.renderActiveTabContent()}
        </div>
      </div>
    );
  }
}
