package com.springminer.sales.service;

import com.springminer.sales.mapper.OrderMapper;
import com.springminer.sales.vo.OrderDetailVo;
import org.springframework.stereotype.Service;

@Service
public class OrderService {

    private final OrderMapper orderMapper;

    public OrderService(OrderMapper orderMapper) {
        this.orderMapper = orderMapper;
    }

    public OrderDetailVo getOrderDetail(String orderId) {
        OrderDetailVo orderDetailVo = orderMapper.selectOrderDetail(orderId);
        orderDetailVo.setOrderStatus("결제완료");
        return orderDetailVo;
    }

    public int updateDeliveryStatus(String orderId, String deliveryStatus) {
        return orderMapper.updateDeliveryStatus(orderId, deliveryStatus);
    }
}
